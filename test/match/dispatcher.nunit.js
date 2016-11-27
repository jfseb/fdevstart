var process = require('process')
var root = (process.env.DO_COVERAGE) ? '../../gen_cov' : '../../gen'

var debug = require('debug')('dispatcher.nunit')

const dispatcher = require(root + '/match/dispatcher.js').dispatcher

exports.testReplacePattern = function (test) {
  const fn = dispatcher._test.sameOrStar
  // test.expect(3)
  test.deepEqual('a', 'a', 'a is a')
  test.deepEqual(fn(undefined, null), true, ' abc abc')
  test.deepEqual(fn('abc', 'abc'), true, ' abc abc')
  test.deepEqual(/abc/ instanceof RegExp, true, ' abc abc')
  test.equal(fn('abc', /abc/), true, 'abc ertion should pass')
  test.equal(fn('abc', /^bc$/), false, ' abc /^bc$/ shoudl fail')
  test.equal(fn('abc', /bc/), true, 'this should  pass')
  test.equal(fn('abc', new RegExp(/.*/)), true, ' generic star should pass')
  test.equal(fn('abc', /def/), false, ' abc def')
  test.done()
}

exports.testSameOrStarFunction = function (test) {
  const fn = dispatcher._test.sameOrStar
  // test.expect(3)
  const fnX = function (sString) {
    return Boolean(sString === 'a')
  }
  test.deepEqual(fn('a', fnX), true, 'a is a')
  test.deepEqual(fn('b', fnX), false, 'b is not ok')
  test.done()
}

exports.testNrMatches1 = function (test) {
  var fut = dispatcher._test.nrMatches
  test.ok(true, 'this assertion should fail')
  test.equal(fut({abc: 'def', hij: 1}, {hij: 4}), 1, 'ok')
  test.done()
}

exports.testNrMatches2 = function (test) {
  var fut = dispatcher._test.nrMatches
  test.equal(fut({abc: 'def', hij: 1}, {hijs: 4}), 0, 'ok')
  test.done()
}

exports.testNrMatches2 = function (test) {
  var fut = dispatcher._test.nrMatches
  test.equal(fut({abc: 'def', hij: 1, k: 3, lmn: 4}, {hij: 4, 'lmn': 5}), 2, 'ok')
  test.done()
}

exports.testFn = function (test) {
  test.ok(true, 'this assertion should fail')
  var fut = dispatcher._test.nrMatches
  test.equal(fut({abc: 'def', hij: 1}, {hij: 4}), 1, 'ok')
  test.done()
}

// nomatches(a,b)  nr of members in b which are not present in a.
// + nr of members in a which are not present in b

exports.test_nrNoMatches1 = function (test) {
  test.ok(true, 'this assertion should fail')
  var fut = dispatcher._test.nrNoMatches
  test.equal(fut({abc: 'def', hij: 1}, {hij: 4}), 1, 'ok')
  test.done()
}

exports.test_nrNoMatches2 = function (test) {
  var fut = dispatcher._test.nrNoMatches
  test.equal(fut({abc: 'def', hij: 1}, {hijs: 4}), 2, 'ok')
  test.done()
}

exports.test_nrNoMatches2 = function (test) {
  var fut = dispatcher._test.nrNoMatches
  test.equal(fut({abc: 'def', hij: 1, k: 3, lmn: 4}, {hij: 4, 'lmn': 5, u: 3}), 3, 'ok')
  test.done()
}

exports.test_expandParametersInURL = function (test) {
  var fut = dispatcher._test.expandParametersInURL
  test.equal(fut({
    context: {
      abc: 'def', hij: 1
    },
    result: {
      type: 'url', pattern: 'http://abc{abc}?def={hij}'
    }
  }), 'http://abcdef?def=1', 'ok')
  test.done()
}

exports.test_expandParametersInURL2 = function (test) {
  var fut = dispatcher._test.expandParametersInURL
  test.equal(fut({
    context: {abc: 'def', hij: 1},
    result: {
      type: 'url', pattern: 'http://abc{abc}?klm={abc}&{efabc}=8&def={hij}'
    }
  }), 'http://abcdef?klm=def&{efabc}=8&def=1', 'ok')
  test.done()
}

exports.test_calcDistance = function (test) {
  var fut = dispatcher._test.calcDistance
  test.equal(fut('shell.controller.js', 'shell'), 14, 'shell controller')
  test.equal(fut('CSTR', 'shell'), 505, 'CSTR, shell')
  test.done()
}

exports.test_fnFindUnitTestCorrect = function (test) {
  var fut = dispatcher._test.fnFindUnitTest
  test.deepEqual(fut('NavTargetResolution',
    {
      context: {
        systemObjectId: 'NavTargetResolution'
      },
      result: {
        type: 'URL'
      }
    }),
    {
      context: {
        systemObjectId: 'NavTargetResolution',
        path: 'sap/bc/ui5_ui5/ui2/ushell/test-resources/sap/ushell/qunit/services/NavTargetResolution.qunit.html'
      },
      result: {
        type: 'URL'
      }
    }, 'correct object generated for exact match')
  test.done()
}

exports.test_fnFindUnitTest = function (test) {
  var fut = dispatcher._test.fnFindUnitTest
  test.deepEqual(fut('NavTarget',
    {
      context: {
        systemObjectId: 'NavTarget'
      },
      result: {
        type: 'URL'
      }
    }),
    {
      context: {
        systemObjectId: 'NavTargetResolution',
        path: 'sap/bc/ui5_ui5/ui2/ushell/test-resources/sap/ushell/qunit/services/NavTargetResolution.qunit.html'
      },
      result: {
        type: 'URL'
      }
    }, 'resolved correct for NavTarget')
  test.done()
}

exports.test_fnFindUnitTest = function (test) {
  var fut = dispatcher._test.fnFindUnitTest
  test.deepEqual(fut('ClientSideTrgetResolution',
    {
      context: {systemObjectId: 'NavTarget'},
      result: {
        type: 'URL'
      }
    }),
    {
      context: {
        systemObjectId: 'ClientSideTargetResolution',
        path: 'sap/bc/ui5_ui5/ui2/ushell/test-resources/sap/ushell/qunit/services/ClientSideTargetResolution.qunit.html'
      },
      result: {
        type: 'URL'
      }
    }, 'resolved correct for NavTarget')
  test.done()
}

exports.test_fnFindUnitTest = function (test) {
  var fut = dispatcher._test.fnFindUnitTest
  test.deepEqual(fut('ClomichResolution',
    {
      context: {systemObjectId: 'NavTarget'},
      result: {
        type: 'URL'
      }
    }),
    null, 'too distant')
  test.done()
}

var aShowEntityActions = [{
  context: {
    systemId: 'uv2',
    client: '120',
    systemtype: 'ABAPFES',
    tool: 'FLP'
  },
  result: {
    type: 'URL',
    pattern: 'https://ldciuv2.wdf.sap.corp:44355/sap/bc/ui5_ui5/ui2/ushell/shells/abap/FioriLaunchpad.html?sap-client=120'
  }
},
  {
    context: {
      systemId: 'uv2',
      client: /^\d{3,3}$/,
      systemObjectCategory: 'fiori catalog',
      systemObjectId: /.*/,
      systemtype: 'ABAPFES',
      tool: 'FLPD'
    },
    result: {
      type: 'URL',
      pattern: 'https://ldciuv2.wdf.sap.corp:44355/sap/bc/ui5_ui5/sap/arsrvc_upb_admn/main.html?sap-client=120'
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

exports.test_filterShowEntity = function (test) {
  debug('Here dispatcher' + JSON.stringify(dispatcher))
  var fut = dispatcher._test.filterShowEntity
  var aMerged = fut({
    systemId: 'uv2',
    client: '120',
    systemObjectCategory: 'catalog',
    systemObjectId: 'SAP_BC',
    tool: 'FLP'
  }, aShowEntityActions)

  test.deepEqual(aMerged, {
    context: {
      _ranking: 0.9,
      _weight: { systemObjectCategory: 0 },
      systemId: 'uv2',
      client: '120',
      systemObjectCategory: 'fiori catalog',
      systemObjectId: 'SAP_BC',
      systemtype: 'ABAPFES',
      tool: 'FLP'
    },
    result: {
      type: 'URL',
      pattern: 'https://ldciuv2.wdf.sap.corp:44355/sap/bc/ui5_ui5/ui2/ushell/shells/abap/FioriLaunchpad.html?sap-client=120'
    }
  }, 'ok')
  test.done()
}

exports.test_filterShowEntityMoreContext = function (test) {
  var fut = dispatcher._test.filterShowEntity
  var aMerged = fut({
    systemId: 'UV2',
    client: '120',
    andThis: '100',
    systemObjectCategory: 'CATALOG',
    systemObjectId: 'SAP_BC',
    tool: 'FLPD'
  }, aShowEntityActions)

  test.deepEqual(aMerged, {
    context: {
      systemId: 'uv2',
      client: '120',
      andThis: '100',
      systemObjectCategory: 'fiori catalog',
      systemObjectId: 'SAP_BC',
      systemtype: 'ABAPFES',
      tool: 'FLPD',
      _ranking: 0.9,
      _weight: { systemObjectCategory: 0 }
    },
    result: {
      type: 'URL',
      pattern: 'https://ldciuv2.wdf.sap.corp:44355/sap/bc/ui5_ui5/sap/arsrvc_upb_admn/main.html?sap-client=120'
    }
  }, 'ok')
  test.done()
}

exports.test_filterShowEntityUnitTestX = function (test) {
  var fut = dispatcher._test.filterShowEntity
  var aMerged = fut({
    systemObjectCategory: 'unit test',
    systemObjectId: 'NavTargetResolution'
  }, dispatcher._test._aShowEntityActions)
  test.deepEqual(aMerged, {
    context: {
      _weight: {
        systemObjectCategory: 0, systemObjectId: 0
      },
      systemObjectCategory: 'unit test',
      systemObjectId: 'NavTargetResolution',
      path: 'sap/bc/ui5_ui5/ui2/ushell/test-resources/sap/ushell/qunit/services/NavTargetResolution.qunit.html'
    },
    result: {
      type: 'URL',
      pattern: 'http://localhost:8080/{path}'
    }
  }, 'unit test resolved')
  test.done()
}

exports.test_filterShowEntityUnitSloppy = function (test) {
  var fut = dispatcher._test.filterShowEntity
  var aMerged = fut({
    systemObjectCategory: 'unit',
    systemObjectId: 'NavTargetResol'
  }, dispatcher._test._aShowEntityActions)

  test.deepEqual(aMerged, {
    context: {
      _weight: {
        systemObjectCategory: 0, systemObjectId: 5
      },
      systemObjectCategory: 'unit test',
      systemObjectId: 'NavTargetResolution',
      path: 'sap/bc/ui5_ui5/ui2/ushell/test-resources/sap/ushell/qunit/services/NavTargetResolution.qunit.html'
    },
    result: {
      type: 'URL',
      pattern: 'http://localhost:8080/{path}'
    }
  }, 'unit test resolved')
  test.done()
}

exports.test_filterShowEntityUnitTestSthNull = function (test) {
  var fut = dispatcher._test.filterShowEntity
  var aMerged = fut({
    systemId: null,
    systemObjectCategory: 'unit',
    systemObjectId: 'NavTargetResolution'
  }, dispatcher._test._aShowEntityActions)

  test.deepEqual(aMerged, {
    context: {
      systemObjectCategory: 'unit test',
      _weight: { systemObjectCategory: 0, systemObjectId: 0 },
      //   systemId: undefined,
      systemObjectId: 'NavTargetResolution',
      path: 'sap/bc/ui5_ui5/ui2/ushell/test-resources/sap/ushell/qunit/services/NavTargetResolution.qunit.html'
    },
    result: {
      type: 'URL',
      pattern: 'http://localhost:8080/{path}'
    }
  }, 'unit test resolved')
  test.done()
}

var aShowEntityActionsBest = [
  {
    context: {
      systemId: 'uv2',
      A: 'A'
    },
    result: {
      type: 'A'
    }
  },
  {
    context: {
      systemId: 'uv2',
      A: 'a',
      B: 'b',
      'E': 'e'
    },
    result: {
      type: 'e'
    }
  },
  {
    context: {
      systemId: 'uv2',
      A: 'a',
      B: 'b'
    },
    result: {
      type: 'Best'
    }
  },
  {
    context: {
      systemId: 'uv2',
      A: 'a',
      B: 'b',
      C: 'c'
    },
    result: {
      type: 'c'
    }
  }

]

exports.testFilterShowEntityBetterMatch = function (test) {
  var fut = dispatcher._test.filterShowEntity
  var aMerged = fut({
    systemId: 'uv2',
    A: 'a',
    B: 'b'
  }, aShowEntityActionsBest)

  test.deepEqual(aMerged, {
    context: {
      systemId: 'uv2',
      A: 'a',
      B: 'b'
    },
    result: {
      type: 'Best'
    }
  }, 'ok')
  test.done()
}
