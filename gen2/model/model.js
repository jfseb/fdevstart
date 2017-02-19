/**
 * Functionality managing the match models
 *
 * @file
 */
"use strict";

var debug = require("debug");
var debuglog = debug('model');
var logger = require("../utils/logger");
var loadlog = logger.logger('modelload', '');
var IMatch = require("../match/ifmatch");
var InputFilterRules = require("../match/inputFilterRules");
var Tools = require("../match/tools");
var fs = require("fs");
var Meta = require("./meta");
var Utils = require("../utils/utils");
var CircularSer = require("../utils/circularser");
var process = require("process");
var _ = require("lodash");
/**
 * the model path, may be controlled via environment variable
 */
var envModelPath = process.env["ABOT_MODELPATH"] || "testmodel";
var ARR_MODEL_PROPERTIES = ["domain", "bitindex", "defaultkeycolumn", "defaulturi", "categoryDescribed", "columns", "description", "tool", "toolhidden", "synonyms", "category", "wordindex", "exactmatch", "hidden"];
function addSynonyms(synonyms, category, synonymFor, bitindex, mRules, seen) {
    synonyms.forEach(function (syn) {
        var oRule = {
            category: category,
            matchedString: synonymFor,
            type: 0 /* WORD */
            , word: syn,
            bitindex: bitindex,
            _ranking: 0.95
        };
        debuglog(debuglog.enabled ? "inserting synonym" + JSON.stringify(oRule) : '-');
        insertRuleIfNotPresent(mRules, oRule, seen);
    });
}
function getRuleKey(rule) {
    var r1 = rule.matchedString + "-|-" + rule.category + " -|- " + rule.type + " -|- " + rule.word + " ";
    if (rule.range) {
        var r2 = getRuleKey(rule.range.rule);
        r1 += " -|- " + rule.range.low + "/" + rule.range.high + " -|- " + r2;
    }
    return r1;
}
var Breakdown = require("../match/breakdown");
/* given a rule which represents a word sequence which is split during tokenization */
function addBestSplit(mRules, rule, seenRules) {
    //if(!global_AddSplits) {
    //    return;
    //}
    if (rule.type !== 0 /* WORD */) {
            return;
        }
    var best = Breakdown.makeMatchPattern(rule.lowercaseword);
    if (!best) {
        return;
    }
    var newRule = {
        category: rule.category,
        matchedString: rule.matchedString,
        bitindex: rule.bitindex,
        word: best.longestToken,
        type: 0,
        lowercaseword: best.longestToken,
        _ranking: 0.95,
        //    exactOnly : rule.exactOnly,
        range: best.span
    };
    if (rule.exactOnly) {
        newRule.exactOnly = rule.exactOnly;
    }
    ;
    newRule.range.rule = rule;
    insertRuleIfNotPresent(mRules, newRule, seenRules);
}
exports.addBestSplit = addBestSplit;
function insertRuleIfNotPresent(mRules, rule, seenRules) {
    if (rule.type !== 0 /* WORD */) {
            mRules.push(rule);
            return;
        }
    if (rule.word === undefined || rule.matchedString === undefined) {
        throw new Error('illegal rule' + JSON.stringify(rule, undefined, 2));
    }
    var r = getRuleKey(rule);
    /* if( (rule.word === "service" || rule.word=== "services") && r.indexOf('OData') >= 0) {
         console.log("rulekey is" + r);
         console.log("presence is " + JSON.stringify(seenRules[r]));
     }*/
    rule.lowercaseword = rule.word.toLowerCase();
    if (seenRules[r]) {
        debuglog(debuglog.enabled ? "Attempting to insert duplicate" + JSON.stringify(rule, undefined, 2) : "-");
        var duplicates = seenRules[r].filter(function (oEntry) {
            return 0 === InputFilterRules.compareMRuleFull(oEntry, rule);
        });
        if (duplicates.length > 0) {
            return;
        }
    }
    seenRules[r] = seenRules[r] || [];
    seenRules[r].push(rule);
    if (rule.word === "") {
        debuglog(debuglog.enabled ? 'Skipping rule with emtpy word ' + JSON.stringify(rule, undefined, 2) : '-');
        loadlog('Skipping rule with emtpy word ' + JSON.stringify(rule, undefined, 2));
        return;
    }
    mRules.push(rule);
    addBestSplit(mRules, rule, seenRules);
    return;
}
function readFileAsJSON(filename) {
    var data = fs.readFileSync(filename, 'utf-8');
    try {
        return JSON.parse(data);
    } catch (e) {
        console.log("Content of file " + filename + " is no json" + e);
        process.exit(-1);
    }
    return undefined;
}
function loadModelData(modelPath, oMdl, sModelName, oModel) {
    // read the data ->
    // data is processed into mRules directly,
    var bitindex = oMdl.bitindex;
    var sFileName = './' + modelPath + '/' + sModelName + ".data.json";
    var oMdlData = readFileAsJSON(sFileName);
    oMdlData.forEach(function (oEntry) {
        if (!oEntry.domain) {
            oEntry._domain = oMdl.domain;
        }
        if (!oEntry.tool && oMdl.tool.name) {
            oEntry.tool = oMdl.tool.name;
        }
        oModel.records.push(oEntry);
        oMdl.category.forEach(function (cat) {
            if (oEntry[cat] === 'undefined') {
                oEntry[cat] = "n/a";
                var bug = "INCONSISTENT*> ModelData " + sFileName + " does not contain category " + cat + " with value 'undefined', undefined is illegal value, use n/a " + JSON.stringify(oEntry) + "";
                debuglog(bug);
            }
        });
        oMdl.wordindex.forEach(function (category) {
            if (oEntry[category] === undefined) {
                debuglog("INCONSISTENT*> ModelData " + sFileName + " does not contain category " + category + " of wordindex" + JSON.stringify(oEntry) + "");
                return;
            }
            if (oEntry[category] !== "*") {
                var sString = oEntry[category];
                debuglog("pushing rule with " + category + " -> " + sString);
                var oRule = {
                    category: category,
                    matchedString: sString,
                    type: 0 /* WORD */
                    , word: sString,
                    bitindex: bitindex,
                    _ranking: 0.95
                };
                if (oMdl.exactmatch && oMdl.exactmatch.indexOf(category) >= 0) {
                    oRule.exactOnly = true;
                }
                insertRuleIfNotPresent(oModel.mRules, oRule, oModel.seenRules);
                if (oMdlData.synonyms && oMdlData.synonyms[category]) {
                    addSynonyms(oMdlData.synonyms[category], category, sString, bitindex, oModel.mRules, oModel.seenRules);
                }
                if (oEntry.synonyms && oEntry.synonyms[category]) {
                    addSynonyms(oEntry.synonyms[category], category, sString, bitindex, oModel.mRules, oModel.seenRules);
                }
            }
        });
    });
}
function loadModel(modelPath, sModelName, oModel) {
    debuglog(" loading " + sModelName + " ....");
    var oMdl = readFileAsJSON('./' + modelPath + '/' + sModelName + ".model.json");
    mergeModelJson(sModelName, oMdl, oModel);
    loadModelData(modelPath, oMdl, sModelName, oModel);
}
function getDomainBitIndex(domain, oModel) {
    var index = oModel.domains.indexOf(domain);
    if (index < 0) {
        index = oModel.domains.length;
    }
    if (index >= 32) {
        throw new Error("too many domain for single 32 bit index");
    }
    return 0x0001 << index;
}
exports.getDomainBitIndex = getDomainBitIndex;
function mergeModelJson(sModelName, oMdl, oModel) {
    var categoryDescribedMap = {};
    oMdl.bitindex = getDomainBitIndex(oMdl.domain, oModel);
    oMdl.categoryDescribed = [];
    // rectify category
    oMdl.category = oMdl.category.map(function (cat) {
        if (typeof cat === "string") {
            return cat;
        }
        if (typeof cat.name !== "string") {
            console.log("Missing name in object typed category in " + JSON.stringify(cat) + " in model " + sModelName);
            process.exit(-1);
        }
        categoryDescribedMap[cat.name] = cat;
        oMdl.categoryDescribed.push(cat);
        return cat.name;
    });
    // add the categories to the model:
    oMdl.category.forEach(function (category) {
        insertRuleIfNotPresent(oModel.mRules, {
            category: "category",
            matchedString: category,
            type: 0 /* WORD */
            , word: category,
            lowercaseword: category.toLowerCase(),
            bitindex: oMdl.bitindex,
            _ranking: 0.95
        }, oModel.seenRules);
    });
    if (oModel.domains.indexOf(oMdl.domain) >= 0) {
        debuglog("***********here mdl" + JSON.stringify(oMdl, undefined, 2));
        throw new Error('Domain ' + oMdl.domain + ' already loaded while loading ' + sModelName + '?');
    }
    // check properties of model
    Object.keys(oMdl).sort().forEach(function (sProperty) {
        if (ARR_MODEL_PROPERTIES.indexOf(sProperty) < 0) {
            throw new Error('Model property "' + sProperty + '" not a known model property in model of domain ' + oMdl.domain + ' ');
        }
    });
    // consider streamlining the categories
    oModel.rawModels[oMdl.domain] = oMdl;
    oModel.full.domain[oMdl.domain] = {
        description: oMdl.description,
        categories: categoryDescribedMap,
        bitindex: oMdl.bitindex
    };
    // check that
    // check that members of wordindex are in categories,
    oMdl.wordindex = oMdl.wordindex || [];
    oMdl.wordindex.forEach(function (sWordIndex) {
        if (oMdl.category.indexOf(sWordIndex) < 0) {
            throw new Error('Model wordindex "' + sWordIndex + '" not a category of domain ' + oMdl.domain + ' ');
        }
    });
    oMdl.exactmatch = oMdl.exactmatch || [];
    oMdl.exactmatch.forEach(function (sExactMatch) {
        if (oMdl.category.indexOf(sExactMatch) < 0) {
            throw new Error('Model exactmatch "' + sExactMatch + '" not a category of domain ' + oMdl.domain + ' ');
        }
    });
    oMdl.columns = oMdl.columns || [];
    oMdl.columns.forEach(function (sExactMatch) {
        if (oMdl.category.indexOf(sExactMatch) < 0) {
            throw new Error('Model column "' + sExactMatch + '" not a category of domain ' + oMdl.domain + ' ');
        }
    });
    // add relation domain -> category
    var domainStr = MetaF.Domain(oMdl.domain).toFullString();
    var relationStr = MetaF.Relation(Meta.RELATION_hasCategory).toFullString();
    var reverseRelationStr = MetaF.Relation(Meta.RELATION_isCategoryOf).toFullString();
    oMdl.category.forEach(function (sCategory) {
        var CategoryString = MetaF.Category(sCategory).toFullString();
        oModel.meta.t3[domainStr] = oModel.meta.t3[domainStr] || {};
        oModel.meta.t3[domainStr][relationStr] = oModel.meta.t3[domainStr][relationStr] || {};
        oModel.meta.t3[domainStr][relationStr][CategoryString] = {};
        oModel.meta.t3[CategoryString] = oModel.meta.t3[CategoryString] || {};
        oModel.meta.t3[CategoryString][reverseRelationStr] = oModel.meta.t3[CategoryString][reverseRelationStr] || {};
        oModel.meta.t3[CategoryString][reverseRelationStr][domainStr] = {};
    });
    // add a precice domain matchrule
    insertRuleIfNotPresent(oModel.mRules, {
        category: "domain",
        matchedString: oMdl.domain,
        type: 0 /* WORD */
        , word: oMdl.domain,
        bitindex: oMdl.bitindex,
        _ranking: 0.95
    }, oModel.seenRules);
    // check the tool
    if (oMdl.tool && oMdl.tool.requires) {
        var requires = Object.keys(oMdl.tool.requires || {});
        var diff = _.difference(requires, oMdl.category);
        if (diff.length > 0) {
            console.log(" " + oMdl.domain + " : Unkown category in requires of tool: \"" + diff.join('"') + '"');
            process.exit(-1);
        }
        var optional = Object.keys(oMdl.tool.optional);
        diff = _.difference(optional, oMdl.category);
        if (diff.length > 0) {
            console.log(" " + oMdl.domain + " : Unkown category optional of tool: \"" + diff.join('"') + '"');
            process.exit(-1);
        }
        Object.keys(oMdl.tool.sets || {}).forEach(function (setID) {
            var diff = _.difference(oMdl.tool.sets[setID].set, oMdl.category);
            if (diff.length > 0) {
                console.log(" " + oMdl.domain + " : Unkown category in setId " + setID + " of tool: \"" + diff.join('"') + '"');
                process.exit(-1);
            }
        });
        // extract tools an add to tools:
        oModel.tools.filter(function (oEntry) {
            if (oEntry.name === (oMdl.tool && oMdl.tool.name)) {
                console.log("Tool " + oMdl.tool.name + " already present when loading " + sModelName);
                //throw new Error('Domain already loaded?');
                process.exit(-1);
            }
        });
    } else {
        oMdl.toolhidden = true;
        oMdl.tool.requires = { "impossible": {} };
    }
    // add the tool name as rule unless hidden
    if (!oMdl.toolhidden && oMdl.tool && oMdl.tool.name) {
        insertRuleIfNotPresent(oModel.mRules, {
            category: "tool",
            matchedString: oMdl.tool.name,
            type: 0 /* WORD */
            , word: oMdl.tool.name,
            bitindex: oMdl.bitindex,
            _ranking: 0.95
        }, oModel.seenRules);
    }
    ;
    if (oMdl.synonyms && oMdl.synonyms["tool"]) {
        addSynonyms(oMdl.synonyms["tool"], "tool", oMdl.tool.name, oMdl.bitindex, oModel.mRules, oModel.seenRules);
    }
    ;
    if (oMdl.synonyms) {
        Object.keys(oMdl.synonyms).forEach(function (ssynkey) {
            if (oMdl.category.indexOf(ssynkey) >= 0 && ssynkey !== "tool") {
                if (oModel.full.domain[oMdl.domain].categories[ssynkey]) {
                    oModel.full.domain[oMdl.domain].categories[ssynkey].synonyms = oMdl.synonyms[ssynkey];
                }
                addSynonyms(oMdl.synonyms[ssynkey], "category", ssynkey, oMdl.bitindex, oModel.mRules, oModel.seenRules);
            }
        });
    }
    oModel.domains.push(oMdl.domain);
    if (oMdl.tool.name) {
        oModel.tools.push(oMdl.tool);
    }
    oModel.category = oModel.category.concat(oMdl.category);
    oModel.category.sort();
    oModel.category = oModel.category.filter(function (string, index) {
        return oModel.category[index] !== oModel.category[index + 1];
    });
} // loadmodel
function splitRules(rules) {
    var res = {};
    var nonWordRules = [];
    rules.forEach(function (rule) {
        if (rule.type === 0 /* WORD */) {
                if (!rule.lowercaseword) {
                    throw new Error("Rule has no member lowercaseword" + JSON.stringify(rule));
                }
                res[rule.lowercaseword] = res[rule.lowercaseword] || { bitindex: 0, rules: [] };
                res[rule.lowercaseword].bitindex = res[rule.lowercaseword].bitindex | rule.bitindex;
                res[rule.lowercaseword].rules.push(rule);
            } else {
            nonWordRules.push(rule);
        }
    });
    return {
        wordMap: res,
        nonWordRules: nonWordRules,
        allRules: rules,
        wordCache: {}
    };
}
exports.splitRules = splitRules;
function cmpLengthSort(a, b) {
    var d = a.length - b.length;
    if (d) {
        return d;
    }
    return a.localeCompare(b);
}
var Distance = require("../utils/damerauLevenshtein");
var Algol = require("../match/algol");
// offset[0] : len-2
//             len -1
//             len
//             len +1
//             len +2
//             len +3
function findNextLen(targetLen, arr, offsets) {
    offsets.shift();
    for (var i = offsets[4]; i < arr.length && arr[i].length <= targetLen; ++i) {}
    //console.log("pushing " + i);
    offsets.push(i);
}
exports.findNextLen = findNextLen;
function addRangeRulesUnlessPresent(rules, lcword, rangeRules, presentRulesForKey, seenRules) {
    rangeRules.forEach(function (rangeRule) {
        var newRule = Object.assign({}, rangeRule);
        newRule.lowercaseword = lcword;
        newRule.word = lcword;
        //if((lcword === 'services' || lcword === 'service') && newRule.range.rule.lowercaseword.indexOf('odata')>=0) {
        //    console.log("adding "+ JSON.stringify(newRule) + "\n");
        //}
        //todo: check whether an equivalent rule is already present?
        var cnt = rules.length;
        insertRuleIfNotPresent(rules, newRule, seenRules);
    });
}
exports.addRangeRulesUnlessPresent = addRangeRulesUnlessPresent;
function addCloseExactRangeRules(rules, seenRules) {
    var keysMap = {};
    var rangeKeysMap = {};
    rules.forEach(function (rule) {
        if (rule.type === 0 /* WORD */) {
                //keysMap[rule.lowercaseword] = 1;
                keysMap[rule.lowercaseword] = keysMap[rule.lowercaseword] || [];
                keysMap[rule.lowercaseword].push(rule);
                if (!rule.exactOnly && rule.range) {
                    rangeKeysMap[rule.lowercaseword] = rangeKeysMap[rule.lowercaseword] || [];
                    rangeKeysMap[rule.lowercaseword].push(rule);
                }
            }
    });
    var keys = Object.keys(keysMap);
    keys.sort(cmpLengthSort);
    var len = 0;
    keys.forEach(function (key, index) {
        if (key.length != len) {}
        len = key.length;
    });
    //   keys = keys.slice(0,2000);
    var rangeKeys = Object.keys(rangeKeysMap);
    rangeKeys.sort(cmpLengthSort);
    //console.log(` ${keys.length} keys and ${rangeKeys.length} rangekeys `);
    var low = 0;
    var high = 0;
    var lastlen = 0;
    var offsets = [0, 0, 0, 0, 0, 0];
    var len = rangeKeys.length;
    findNextLen(0, keys, offsets);
    findNextLen(1, keys, offsets);
    findNextLen(2, keys, offsets);
    rangeKeys.forEach(function (rangeKey) {
        if (rangeKey.length !== lastlen) {
            for (i = lastlen + 1; i <= rangeKey.length; ++i) {
                findNextLen(i + 2, keys, offsets);
            }
            //   console.log(` shifted to ${rangeKey.length} with offsets beeing ${offsets.join(' ')}`);
            //   console.log(` here 0 ${offsets[0]} : ${keys[Math.min(keys.length-1, offsets[0])].length}  ${keys[Math.min(keys.length-1, offsets[0])]} `);
            //  console.log(` here 5-1  ${keys[offsets[5]-1].length}  ${keys[offsets[5]-1]} `);
            //   console.log(` here 5 ${offsets[5]} : ${keys[Math.min(keys.length-1, offsets[5])].length}  ${keys[Math.min(keys.length-1, offsets[5])]} `);
            lastlen = rangeKey.length;
        }
        for (var i = offsets[0]; i < offsets[5]; ++i) {
            var d = Distance.calcDistanceAdjusted(rangeKey, keys[i]);
            // console.log(`${rangeKey.length-keys[i].length} ${d} ${rangeKey} and ${keys[i]}  `);
            if (d !== 1.0 && d >= Algol.Cutoff_rangeCloseMatch) {
                //console.log(`would add ${rangeKey} for ${keys[i]} ${d}`);
                var cnt = rules.length;
                // we only have to add if there is not yet a match rule here which points to the same
                addRangeRulesUnlessPresent(rules, keys[i], rangeKeysMap[rangeKey], keysMap[keys[i]], seenRules);
                if (rules.length > cnt) {}
            }
        }
    });
    /*
    [
        ['aEFG','aEFGH'],
        ['aEFGH','aEFGHI'],
        ['Odata','ODatas'],
    ['Odata','Odatas'],
    ['Odata','Odatb'],
    ['Odata','UData'],
    ['service','services'],
    ['this isfunny and more','this isfunny and mores'],
    ].forEach(rec => {
        console.log(`distance ${rec[0]} ${rec[1]} : ${Distance.calcDistance(rec[0],rec[1])}  adf ${Distance.calcDistanceAdjusted(rec[0],rec[1])} `);
     });
    console.log("distance Odata Udata"+ Distance.calcDistance('OData','UData'));
    console.log("distance Odata Odatb"+ Distance.calcDistance('OData','ODatb'));
    console.log("distance Odatas Odata"+ Distance.calcDistance('OData','ODataa'));
    console.log("distance Odatas abcde"+ Distance.calcDistance('abcde','abcdef'));
    console.log("distance services "+ Distance.calcDistance('services','service'));
    */
}
exports.addCloseExactRangeRules = addCloseExactRangeRules;
var n = 0;
function loadModels(modelPath) {
    var oModel;
    oModel = {
        full: { domain: {} },
        rawModels: {},
        domains: [],
        tools: [],
        rules: undefined,
        category: [],
        operators: {},
        mRules: [],
        seenRules: {},
        records: [],
        meta: { t3: {} }
    };
    var t = Date.now();
    modelPath = modelPath || envModelPath;
    try {
        var a = CircularSer.load('./' + modelPath + '/_cachefalse.js');
        //console.log("found a cache ?  " + !!a);
        //a = undefined;
        if (a) {
            debuglog(" return preparese model ");
            if (process.env.ABOT_EMAIL_USER) {
                console.log("loaded models from cache in " + (Date.now() - t) + " ");
            }
            return a;
        }
    } catch (e) {}
    var mdls = readFileAsJSON('./' + modelPath + '/models.json');
    mdls.forEach(function (sModelName) {
        loadModel(modelPath, sModelName, oModel);
    });
    // add the categories to the model:
    /*
    oModel.category.forEach(function (category) {
        insertRuleIfNotPresent(oModel.mRules, {
            category: "category",
            matchedString: category,
            type: IMatch.EnumRuleType.WORD,
            word: category,
            lowercaseword: category.toLowerCase(),
            bitindex : oMdl.
            _ranking: 0.95
        }, oModel.seenRules);
    });
    */
    var metaBitIndex = getDomainBitIndex('meta', oModel);
    // add the domain meta rule
    insertRuleIfNotPresent(oModel.mRules, {
        category: "meta",
        matchedString: "domain",
        type: 0 /* WORD */
        , word: "domain",
        bitindex: metaBitIndex,
        _ranking: 0.95
    }, oModel.seenRules);
    var fillerBitIndex = getDomainBitIndex('meta', oModel);
    //add a filler rule
    var fillers = readFileAsJSON('./' + modelPath + '/filler.json');
    var re = "^((" + fillers.join(")|(") + "))$";
    oModel.mRules.push({
        category: "filler",
        type: 1 /* REGEXP */
        , regexp: new RegExp(re, "i"),
        matchedString: "filler",
        bitindex: fillerBitIndex,
        _ranking: 0.9
    });
    //add operators
    var operators = readFileAsJSON('./resources/model/operators.json');
    var operatorBitIndex = getDomainBitIndex('operators', oModel);
    Object.keys(operators.operators).forEach(function (operator) {
        if (IMatch.aOperatorNames.indexOf(operator) < 0) {
            debuglog("unknown operator " + operator);
            throw new Error("unknown operator " + operator);
        }
        oModel.operators[operator] = operators.operators[operator];
        oModel.operators[operator].operator = operator;
        Object.freeze(oModel.operators[operator]);
        var word = operator;
        insertRuleIfNotPresent(oModel.mRules, {
            category: "operator",
            word: word.toLowerCase(),
            lowercaseword: word.toLowerCase(),
            type: 0 /* WORD */
            , matchedString: word,
            bitindex: operatorBitIndex,
            _ranking: 0.9
        }, oModel.seenRules);
        // add all synonyms
        if (operators.synonyms[operator]) {
            Object.keys(operators.synonyms[operator]).forEach(function (synonym) {
                insertRuleIfNotPresent(oModel.mRules, {
                    category: "operator",
                    word: synonym.toLowerCase(),
                    lowercaseword: synonym.toLowerCase(),
                    type: 0 /* WORD */
                    , matchedString: operator,
                    bitindex: operatorBitIndex,
                    _ranking: 0.9
                }, oModel.seenRules);
            });
        }
    });
    /*
        })
            {
          category: "filler",
          type: 1,
          regexp: /^((start)|(show)|(from)|(in))$/i,
          matchedString: "filler",
          _ranking: 0.9
        },
    */
    oModel.mRules = oModel.mRules.sort(InputFilterRules.cmpMRule);
    addCloseExactRangeRules(oModel.mRules, oModel.seenRules);
    oModel.mRules = oModel.mRules.sort(InputFilterRules.cmpMRule);
    forceGC();
    oModel.rules = splitRules(oModel.mRules);
    forceGC();
    oModel.tools = oModel.tools.sort(Tools.cmpTools);
    delete oModel.seenRules;
    debuglog('saving');
    forceGC();
    CircularSer.save('./' + modelPath + '/_cachefalse.js', oModel);
    forceGC();
    if (process.env.ABOT_EMAIL_USER) {
        console.log("loaded models by calculation in " + (Date.now() - t) + " ");
    }
    return oModel;
}
exports.loadModels = loadModels;
function sortCategoriesByImportance(map, cats) {
    var res = cats.slice(0);
    res.sort(rankCategoryByImportance.bind(undefined, map));
    return res;
}
exports.sortCategoriesByImportance = sortCategoriesByImportance;
function rankCategoryByImportance(map, cata, catb) {
    var catADesc = map[cata];
    var catBDesc = map[catb];
    if (cata === catb) {
        return 0;
    }
    // if a is before b, return -1
    if (catADesc && !catBDesc) {
        return -1;
    }
    if (!catADesc && catBDesc) {
        return +1;
    }
    var prioA = catADesc && catADesc.importance || 99;
    var prioB = catBDesc && catBDesc.importance || 99;
    // lower prio goes to front
    var r = prioA - prioB;
    if (r) {
        return r;
    }
    return cata.localeCompare(catb);
}
exports.rankCategoryByImportance = rankCategoryByImportance;
var MetaF = Meta.getMetaFactory();
function getOperator(mdl, operator) {
    return mdl.operators[operator];
}
exports.getOperator = getOperator;
function getResultAsArray(mdl, a, rel) {
    if (rel.toType() !== 'relation') {
        throw new Error("expect relation as 2nd arg");
    }
    var res = mdl.meta.t3[a.toFullString()] && mdl.meta.t3[a.toFullString()][rel.toFullString()];
    if (!res) {
        return [];
    }
    return Object.getOwnPropertyNames(res).sort().map(MetaF.parseIMeta);
}
exports.getResultAsArray = getResultAsArray;
function getCategoriesForDomain(theModel, domain) {
    if (theModel.domains.indexOf(domain) < 0) {
        throw new Error("Domain \"" + domain + "\" not part of model");
    }
    var res = getResultAsArray(theModel, MetaF.Domain(domain), MetaF.Relation(Meta.RELATION_hasCategory));
    return Meta.getStringArray(res);
}
exports.getCategoriesForDomain = getCategoriesForDomain;
function getTableColumns(theModel, domain) {
    if (theModel.domains.indexOf(domain) < 0) {
        throw new Error("Domain \"" + domain + "\" not part of model");
    }
    return theModel.rawModels[domain].columns.slice(0);
}
exports.getTableColumns = getTableColumns;
function forceGC() {
    if (global && global.gc) {
        global.gc();
    }
}
/**
 * Return all categories of a domain which can appear on a word,
 * these are typically the wordindex domains + entries generated by generic rules
 *
 * The current implementation is a simplification
 */
function getPotentialWordCategoriesForDomain(theModel, domain) {
    // this is a simplified version
    return getCategoriesForDomain(theModel, domain);
}
exports.getPotentialWordCategoriesForDomain = getPotentialWordCategoriesForDomain;
function getDomainsForCategory(theModel, category) {
    if (theModel.category.indexOf(category) < 0) {
        throw new Error("Category \"" + category + "\" not part of model");
    }
    var res = getResultAsArray(theModel, MetaF.Category(category), MetaF.Relation(Meta.RELATION_isCategoryOf));
    return Meta.getStringArray(res);
}
exports.getDomainsForCategory = getDomainsForCategory;
/*
export function getAllRecordCategoriesForTargetCategory(model: IMatch.IModels, category: string, wordsonly: boolean): { [key: string]: boolean } {
    var res = {};
    //
    var fn = wordsonly ? getPotentialWordCategoriesForDomain : getCategoriesForDomain;
    var domains = getDomainsForCategory(model, category);
    domains.forEach(function (domain) {
        fn(model, domain).forEach(function (wordcat) {
            res[wordcat] = true;
        });
    });
    Object.freeze(res);
    return res;
}

export function getAllRecordCategoriesForTargetCategories(model: IMatch.IModels, categories: string[], wordsonly: boolean): { [key: string]: boolean } {
    var res = {};
    //
    var fn = wordsonly ? getPotentialWordCategoriesForDomain : getCategoriesForDomain;
    var domains = undefined;
    categories.forEach(function (category) {
        var catdomains = getDomainsForCategory(model, category)
        if (!domains) {
            domains = catdomains;
        } else {
            domains = _.intersection(domains, catdomains);
        }
    });
    if (domains.length === 0) {
        throw new Error('categories ' + Utils.listToQuotedCommaAnd(categories) + ' have no common domain.')
    }
    domains.forEach(function (domain) {
        fn(model, domain).forEach(function (wordcat) {
            res[wordcat] = true;
        });
    });
    Object.freeze(res);
    return res;
}
*/
/**
 * givena  set  of categories, return a structure
 *
 *
 * { domains : ["DOMAIN1", "DOMAIN2"],
 *   categorySet : {   cat1 : true, cat2 : true, ...}
 * }
 */
function getDomainCategoryFilterForTargetCategories(model, categories, wordsonly) {
    var res = {};
    //
    var fn = wordsonly ? getPotentialWordCategoriesForDomain : getCategoriesForDomain;
    var domains = undefined;
    categories.forEach(function (category) {
        var catdomains = getDomainsForCategory(model, category);
        if (!domains) {
            domains = catdomains;
        } else {
            domains = _.intersection(domains, catdomains);
        }
    });
    if (domains.length === 0) {
        throw new Error('categories ' + Utils.listToQuotedCommaAnd(categories) + ' have no common domain.');
    }
    domains.forEach(function (domain) {
        fn(model, domain).forEach(function (wordcat) {
            res[wordcat] = true;
        });
    });
    Object.freeze(res);
    return { domains: domains,
        categorySet: res };
}
exports.getDomainCategoryFilterForTargetCategories = getDomainCategoryFilterForTargetCategories;
function getDomainCategoryFilterForTargetCategory(model, category, wordsonly) {
    return getDomainCategoryFilterForTargetCategories(model, [category], wordsonly);
}
exports.getDomainCategoryFilterForTargetCategory = getDomainCategoryFilterForTargetCategory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tb2RlbC9tb2RlbC50cyIsIm1vZGVsL21vZGVsLmpzIl0sIm5hbWVzIjpbImRlYnVnIiwicmVxdWlyZSIsImRlYnVnbG9nIiwibG9nZ2VyIiwibG9hZGxvZyIsIklNYXRjaCIsIklucHV0RmlsdGVyUnVsZXMiLCJUb29scyIsImZzIiwiTWV0YSIsIlV0aWxzIiwiQ2lyY3VsYXJTZXIiLCJwcm9jZXNzIiwiXyIsImVudk1vZGVsUGF0aCIsImVudiIsIkFSUl9NT0RFTF9QUk9QRVJUSUVTIiwiYWRkU3lub255bXMiLCJzeW5vbnltcyIsImNhdGVnb3J5Iiwic3lub255bUZvciIsImJpdGluZGV4IiwibVJ1bGVzIiwic2VlbiIsImZvckVhY2giLCJzeW4iLCJvUnVsZSIsIm1hdGNoZWRTdHJpbmciLCJ0eXBlIiwid29yZCIsIl9yYW5raW5nIiwiZW5hYmxlZCIsIkpTT04iLCJzdHJpbmdpZnkiLCJpbnNlcnRSdWxlSWZOb3RQcmVzZW50IiwiZ2V0UnVsZUtleSIsInJ1bGUiLCJyMSIsInJhbmdlIiwicjIiLCJsb3ciLCJoaWdoIiwiQnJlYWtkb3duIiwiYWRkQmVzdFNwbGl0Iiwic2VlblJ1bGVzIiwiYmVzdCIsIm1ha2VNYXRjaFBhdHRlcm4iLCJsb3dlcmNhc2V3b3JkIiwibmV3UnVsZSIsImxvbmdlc3RUb2tlbiIsInNwYW4iLCJleGFjdE9ubHkiLCJleHBvcnRzIiwicHVzaCIsInVuZGVmaW5lZCIsIkVycm9yIiwiciIsInRvTG93ZXJDYXNlIiwiZHVwbGljYXRlcyIsImZpbHRlciIsIm9FbnRyeSIsImNvbXBhcmVNUnVsZUZ1bGwiLCJsZW5ndGgiLCJyZWFkRmlsZUFzSlNPTiIsImZpbGVuYW1lIiwiZGF0YSIsInJlYWRGaWxlU3luYyIsInBhcnNlIiwiZSIsImNvbnNvbGUiLCJsb2ciLCJleGl0IiwibG9hZE1vZGVsRGF0YSIsIm1vZGVsUGF0aCIsIm9NZGwiLCJzTW9kZWxOYW1lIiwib01vZGVsIiwic0ZpbGVOYW1lIiwib01kbERhdGEiLCJkb21haW4iLCJfZG9tYWluIiwidG9vbCIsIm5hbWUiLCJyZWNvcmRzIiwiY2F0IiwiYnVnIiwid29yZGluZGV4Iiwic1N0cmluZyIsImV4YWN0bWF0Y2giLCJpbmRleE9mIiwibG9hZE1vZGVsIiwibWVyZ2VNb2RlbEpzb24iLCJnZXREb21haW5CaXRJbmRleCIsImluZGV4IiwiZG9tYWlucyIsImNhdGVnb3J5RGVzY3JpYmVkTWFwIiwiY2F0ZWdvcnlEZXNjcmliZWQiLCJtYXAiLCJPYmplY3QiLCJrZXlzIiwic29ydCIsInNQcm9wZXJ0eSIsInJhd01vZGVscyIsImZ1bGwiLCJkZXNjcmlwdGlvbiIsImNhdGVnb3JpZXMiLCJzV29yZEluZGV4Iiwic0V4YWN0TWF0Y2giLCJjb2x1bW5zIiwiZG9tYWluU3RyIiwiTWV0YUYiLCJEb21haW4iLCJ0b0Z1bGxTdHJpbmciLCJyZWxhdGlvblN0ciIsIlJlbGF0aW9uIiwiUkVMQVRJT05faGFzQ2F0ZWdvcnkiLCJyZXZlcnNlUmVsYXRpb25TdHIiLCJSRUxBVElPTl9pc0NhdGVnb3J5T2YiLCJzQ2F0ZWdvcnkiLCJDYXRlZ29yeVN0cmluZyIsIkNhdGVnb3J5IiwibWV0YSIsInQzIiwicmVxdWlyZXMiLCJkaWZmIiwiZGlmZmVyZW5jZSIsImpvaW4iLCJvcHRpb25hbCIsInNldHMiLCJzZXRJRCIsInNldCIsInRvb2xzIiwidG9vbGhpZGRlbiIsInNzeW5rZXkiLCJjb25jYXQiLCJzdHJpbmciLCJzcGxpdFJ1bGVzIiwicnVsZXMiLCJyZXMiLCJub25Xb3JkUnVsZXMiLCJ3b3JkTWFwIiwiYWxsUnVsZXMiLCJ3b3JkQ2FjaGUiLCJjbXBMZW5ndGhTb3J0IiwiYSIsImIiLCJkIiwibG9jYWxlQ29tcGFyZSIsIkRpc3RhbmNlIiwiQWxnb2wiLCJmaW5kTmV4dExlbiIsInRhcmdldExlbiIsImFyciIsIm9mZnNldHMiLCJzaGlmdCIsImkiLCJhZGRSYW5nZVJ1bGVzVW5sZXNzUHJlc2VudCIsImxjd29yZCIsInJhbmdlUnVsZXMiLCJwcmVzZW50UnVsZXNGb3JLZXkiLCJyYW5nZVJ1bGUiLCJhc3NpZ24iLCJjbnQiLCJhZGRDbG9zZUV4YWN0UmFuZ2VSdWxlcyIsImtleXNNYXAiLCJyYW5nZUtleXNNYXAiLCJsZW4iLCJrZXkiLCJyYW5nZUtleXMiLCJsYXN0bGVuIiwicmFuZ2VLZXkiLCJjYWxjRGlzdGFuY2VBZGp1c3RlZCIsIkN1dG9mZl9yYW5nZUNsb3NlTWF0Y2giLCJuIiwibG9hZE1vZGVscyIsIm9wZXJhdG9ycyIsInQiLCJEYXRlIiwibm93IiwibG9hZCIsIkFCT1RfRU1BSUxfVVNFUiIsIm1kbHMiLCJtZXRhQml0SW5kZXgiLCJmaWxsZXJCaXRJbmRleCIsImZpbGxlcnMiLCJyZSIsInJlZ2V4cCIsIlJlZ0V4cCIsIm9wZXJhdG9yQml0SW5kZXgiLCJvcGVyYXRvciIsImFPcGVyYXRvck5hbWVzIiwiZnJlZXplIiwic3lub255bSIsImNtcE1SdWxlIiwiZm9yY2VHQyIsImNtcFRvb2xzIiwic2F2ZSIsInNvcnRDYXRlZ29yaWVzQnlJbXBvcnRhbmNlIiwiY2F0cyIsInNsaWNlIiwicmFua0NhdGVnb3J5QnlJbXBvcnRhbmNlIiwiYmluZCIsImNhdGEiLCJjYXRiIiwiY2F0QURlc2MiLCJjYXRCRGVzYyIsInByaW9BIiwiaW1wb3J0YW5jZSIsInByaW9CIiwiZ2V0TWV0YUZhY3RvcnkiLCJnZXRPcGVyYXRvciIsIm1kbCIsImdldFJlc3VsdEFzQXJyYXkiLCJyZWwiLCJ0b1R5cGUiLCJnZXRPd25Qcm9wZXJ0eU5hbWVzIiwicGFyc2VJTWV0YSIsImdldENhdGVnb3JpZXNGb3JEb21haW4iLCJ0aGVNb2RlbCIsImdldFN0cmluZ0FycmF5IiwiZ2V0VGFibGVDb2x1bW5zIiwiZ2xvYmFsIiwiZ2MiLCJnZXRQb3RlbnRpYWxXb3JkQ2F0ZWdvcmllc0ZvckRvbWFpbiIsImdldERvbWFpbnNGb3JDYXRlZ29yeSIsImdldERvbWFpbkNhdGVnb3J5RmlsdGVyRm9yVGFyZ2V0Q2F0ZWdvcmllcyIsIm1vZGVsIiwid29yZHNvbmx5IiwiZm4iLCJjYXRkb21haW5zIiwiaW50ZXJzZWN0aW9uIiwibGlzdFRvUXVvdGVkQ29tbWFBbmQiLCJ3b3JkY2F0IiwiY2F0ZWdvcnlTZXQiLCJnZXREb21haW5DYXRlZ29yeUZpbHRlckZvclRhcmdldENhdGVnb3J5Il0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7QUNLQTs7QURFQSxJQUFBQSxRQUFBQyxRQUFBLE9BQUEsQ0FBQTtBQUVBLElBQUlDLFdBQVdGLE1BQU0sT0FBTixDQUFmO0FBRUEsSUFBQUcsU0FBQUYsUUFBQSxpQkFBQSxDQUFBO0FBRUEsSUFBTUcsVUFBVUQsT0FBT0EsTUFBUCxDQUFjLFdBQWQsRUFBMkIsRUFBM0IsQ0FBaEI7QUFFQSxJQUFBRSxTQUFBSixRQUFBLGtCQUFBLENBQUE7QUFFQSxJQUFBSyxtQkFBQUwsUUFBQSwyQkFBQSxDQUFBO0FBQ0EsSUFBQU0sUUFBQU4sUUFBQSxnQkFBQSxDQUFBO0FBQ0EsSUFBQU8sS0FBQVAsUUFBQSxJQUFBLENBQUE7QUFDQSxJQUFBUSxPQUFBUixRQUFBLFFBQUEsQ0FBQTtBQUNBLElBQUFTLFFBQUFULFFBQUEsZ0JBQUEsQ0FBQTtBQUNBLElBQUFVLGNBQUFWLFFBQUEsc0JBQUEsQ0FBQTtBQUVBLElBQUFXLFVBQUFYLFFBQUEsU0FBQSxDQUFBO0FBQ0EsSUFBQVksSUFBQVosUUFBQSxRQUFBLENBQUE7QUFDQTs7O0FBR0EsSUFBSWEsZUFBZUYsUUFBUUcsR0FBUixDQUFZLGdCQUFaLEtBQWlDLFdBQXBEO0FBb0JBLElBQU1DLHVCQUF1QixDQUFDLFFBQUQsRUFBVyxVQUFYLEVBQXVCLGtCQUF2QixFQUEyQyxZQUEzQyxFQUF5RCxtQkFBekQsRUFBOEUsU0FBOUUsRUFBeUYsYUFBekYsRUFBd0csTUFBeEcsRUFBZ0gsWUFBaEgsRUFBOEgsVUFBOUgsRUFBMEksVUFBMUksRUFBc0osV0FBdEosRUFBbUssWUFBbkssRUFBaUwsUUFBakwsQ0FBN0I7QUFFQSxTQUFBQyxXQUFBLENBQXFCQyxRQUFyQixFQUF5Q0MsUUFBekMsRUFBMkRDLFVBQTNELEVBQStFQyxRQUEvRSxFQUFpR0MsTUFBakcsRUFBOEhDLElBQTlILEVBQXFLO0FBQ2pLTCxhQUFTTSxPQUFULENBQWlCLFVBQVVDLEdBQVYsRUFBYTtBQUMxQixZQUFJQyxRQUFRO0FBQ1JQLHNCQUFVQSxRQURGO0FBRVJRLDJCQUFlUCxVQUZQO0FBR1JRLGtCQUFNLENBSEUsQ0FHRjtBQUhFLGNBSVJDLE1BQU1KLEdBSkU7QUFLUkosc0JBQVVBLFFBTEY7QUFNUlMsc0JBQVU7QUFORixTQUFaO0FBUUE1QixpQkFBU0EsU0FBUzZCLE9BQVQsR0FBb0Isc0JBQXNCQyxLQUFLQyxTQUFMLENBQWVQLEtBQWYsQ0FBMUMsR0FBbUUsR0FBNUU7QUFDQVEsK0JBQXVCWixNQUF2QixFQUErQkksS0FBL0IsRUFBc0NILElBQXRDO0FBQ0gsS0FYRDtBQVlIO0FBRUQsU0FBQVksVUFBQSxDQUFvQkMsSUFBcEIsRUFBd0I7QUFDcEIsUUFBSUMsS0FBS0QsS0FBS1QsYUFBTCxHQUFxQixLQUFyQixHQUE2QlMsS0FBS2pCLFFBQWxDLEdBQTZDLE9BQTdDLEdBQXVEaUIsS0FBS1IsSUFBNUQsR0FBbUUsT0FBbkUsR0FBNkVRLEtBQUtQLElBQWxGLEdBQXlGLEdBQWxHO0FBQ0EsUUFBSU8sS0FBS0UsS0FBVCxFQUFnQjtBQUNaLFlBQUlDLEtBQUtKLFdBQVdDLEtBQUtFLEtBQUwsQ0FBV0YsSUFBdEIsQ0FBVDtBQUNBQyxjQUFNLFVBQVVELEtBQUtFLEtBQUwsQ0FBV0UsR0FBckIsR0FBMkIsR0FBM0IsR0FBaUNKLEtBQUtFLEtBQUwsQ0FBV0csSUFBNUMsR0FBbUQsT0FBbkQsR0FBNkRGLEVBQW5FO0FBQ0g7QUFDRCxXQUFPRixFQUFQO0FBQ0g7QUFHRCxJQUFBSyxZQUFBekMsUUFBQSxvQkFBQSxDQUFBO0FBRUE7QUFDQSxTQUFBMEMsWUFBQSxDQUE2QnJCLE1BQTdCLEVBQTBEYyxJQUExRCxFQUE4RVEsU0FBOUUsRUFBMEg7QUFDdEg7QUFDQTtBQUNBO0FBRUEsUUFBSVIsS0FBS1IsSUFBTCxLQUFjLENBQWxCLENBQWtCLFVBQWxCLEVBQTRDO0FBQ3hDO0FBQ0g7QUFDRCxRQUFJaUIsT0FBT0gsVUFBVUksZ0JBQVYsQ0FBMkJWLEtBQUtXLGFBQWhDLENBQVg7QUFDQSxRQUFJLENBQUNGLElBQUwsRUFBVztBQUNQO0FBQ0g7QUFDRCxRQUFJRyxVQUFVO0FBQ1Y3QixrQkFBVWlCLEtBQUtqQixRQURMO0FBRVZRLHVCQUFlUyxLQUFLVCxhQUZWO0FBR1ZOLGtCQUFVZSxLQUFLZixRQUhMO0FBSVZRLGNBQU1nQixLQUFLSSxZQUpEO0FBS1ZyQixjQUFNLENBTEk7QUFNVm1CLHVCQUFlRixLQUFLSSxZQU5WO0FBT1ZuQixrQkFBVSxJQVBBO0FBUVY7QUFDQVEsZUFBT08sS0FBS0s7QUFURixLQUFkO0FBV0EsUUFBSWQsS0FBS2UsU0FBVCxFQUFvQjtBQUNoQkgsZ0JBQVFHLFNBQVIsR0FBb0JmLEtBQUtlLFNBQXpCO0FBQ0g7QUFBQTtBQUNESCxZQUFRVixLQUFSLENBQWNGLElBQWQsR0FBcUJBLElBQXJCO0FBQ0FGLDJCQUF1QlosTUFBdkIsRUFBK0IwQixPQUEvQixFQUF3Q0osU0FBeEM7QUFDSDtBQTVCRFEsUUFBQVQsWUFBQSxHQUFBQSxZQUFBO0FBK0JBLFNBQUFULHNCQUFBLENBQWdDWixNQUFoQyxFQUE2RGMsSUFBN0QsRUFDSVEsU0FESixFQUNnRDtBQUU1QyxRQUFJUixLQUFLUixJQUFMLEtBQWMsQ0FBbEIsQ0FBa0IsVUFBbEIsRUFBNEM7QUFDeENOLG1CQUFPK0IsSUFBUCxDQUFZakIsSUFBWjtBQUNBO0FBQ0g7QUFDRCxRQUFLQSxLQUFLUCxJQUFMLEtBQWN5QixTQUFmLElBQThCbEIsS0FBS1QsYUFBTCxLQUF1QjJCLFNBQXpELEVBQXFFO0FBQ2pFLGNBQU0sSUFBSUMsS0FBSixDQUFVLGlCQUFpQnZCLEtBQUtDLFNBQUwsQ0FBZUcsSUFBZixFQUFxQmtCLFNBQXJCLEVBQWdDLENBQWhDLENBQTNCLENBQU47QUFDSDtBQUNELFFBQUlFLElBQUlyQixXQUFXQyxJQUFYLENBQVI7QUFDQTs7OztBQUlBQSxTQUFLVyxhQUFMLEdBQXFCWCxLQUFLUCxJQUFMLENBQVU0QixXQUFWLEVBQXJCO0FBQ0EsUUFBSWIsVUFBVVksQ0FBVixDQUFKLEVBQWtCO0FBQ2R0RCxpQkFBU0EsU0FBUzZCLE9BQVQsR0FBb0IsbUNBQW1DQyxLQUFLQyxTQUFMLENBQWVHLElBQWYsRUFBcUJrQixTQUFyQixFQUFnQyxDQUFoQyxDQUF2RCxHQUE2RixHQUF0RztBQUNBLFlBQUlJLGFBQWFkLFVBQVVZLENBQVYsRUFBYUcsTUFBYixDQUFvQixVQUFVQyxNQUFWLEVBQWdCO0FBQ2pELG1CQUFPLE1BQU10RCxpQkFBaUJ1RCxnQkFBakIsQ0FBa0NELE1BQWxDLEVBQTBDeEIsSUFBMUMsQ0FBYjtBQUNILFNBRmdCLENBQWpCO0FBR0EsWUFBSXNCLFdBQVdJLE1BQVgsR0FBb0IsQ0FBeEIsRUFBMkI7QUFDdkI7QUFDSDtBQUNKO0FBQ0RsQixjQUFVWSxDQUFWLElBQWdCWixVQUFVWSxDQUFWLEtBQWdCLEVBQWhDO0FBQ0FaLGNBQVVZLENBQVYsRUFBYUgsSUFBYixDQUFrQmpCLElBQWxCO0FBQ0EsUUFBSUEsS0FBS1AsSUFBTCxLQUFjLEVBQWxCLEVBQXNCO0FBQ2xCM0IsaUJBQVNBLFNBQVM2QixPQUFULEdBQW9CLG1DQUFtQ0MsS0FBS0MsU0FBTCxDQUFlRyxJQUFmLEVBQXFCa0IsU0FBckIsRUFBZ0MsQ0FBaEMsQ0FBdkQsR0FBNkYsR0FBdEc7QUFDQWxELGdCQUFRLG1DQUFtQzRCLEtBQUtDLFNBQUwsQ0FBZUcsSUFBZixFQUFxQmtCLFNBQXJCLEVBQWdDLENBQWhDLENBQTNDO0FBQ0E7QUFDSDtBQUNEaEMsV0FBTytCLElBQVAsQ0FBWWpCLElBQVo7QUFDQU8saUJBQWFyQixNQUFiLEVBQXFCYyxJQUFyQixFQUEyQlEsU0FBM0I7QUFDQTtBQUNIO0FBRUQsU0FBQW1CLGNBQUEsQ0FBd0JDLFFBQXhCLEVBQXlDO0FBQ3JDLFFBQUlDLE9BQU96RCxHQUFHMEQsWUFBSCxDQUFnQkYsUUFBaEIsRUFBMEIsT0FBMUIsQ0FBWDtBQUNBLFFBQUk7QUFDQSxlQUFPaEMsS0FBS21DLEtBQUwsQ0FBV0YsSUFBWCxDQUFQO0FBQ0gsS0FGRCxDQUVFLE9BQU1HLENBQU4sRUFBUztBQUNQQyxnQkFBUUMsR0FBUixDQUFZLHFCQUFvQk4sUUFBcEIsR0FBK0IsYUFBL0IsR0FBK0NJLENBQTNEO0FBQ0F4RCxnQkFBUTJELElBQVIsQ0FBYSxDQUFDLENBQWQ7QUFDSDtBQUNELFdBQU9qQixTQUFQO0FBQ0g7QUFFRCxTQUFBa0IsYUFBQSxDQUF1QkMsU0FBdkIsRUFBMENDLElBQTFDLEVBQXdEQyxVQUF4RCxFQUE0RUMsTUFBNUUsRUFBa0c7QUFDOUY7QUFDQTtBQUNBLFFBQUl2RCxXQUFXcUQsS0FBS3JELFFBQXBCO0FBQ0EsUUFBTXdELFlBQWEsT0FBT0osU0FBUCxHQUFtQixHQUFuQixHQUF5QkUsVUFBekIsR0FBc0MsWUFBekQ7QUFDQSxRQUFJRyxXQUFVZixlQUFlYyxTQUFmLENBQWQ7QUFDQUMsYUFBU3RELE9BQVQsQ0FBaUIsVUFBVW9DLE1BQVYsRUFBZ0I7QUFDN0IsWUFBSSxDQUFDQSxPQUFPbUIsTUFBWixFQUFvQjtBQUNoQm5CLG1CQUFPb0IsT0FBUCxHQUFpQk4sS0FBS0ssTUFBdEI7QUFDSDtBQUNELFlBQUksQ0FBQ25CLE9BQU9xQixJQUFSLElBQWdCUCxLQUFLTyxJQUFMLENBQVVDLElBQTlCLEVBQW9DO0FBQ2hDdEIsbUJBQU9xQixJQUFQLEdBQWNQLEtBQUtPLElBQUwsQ0FBVUMsSUFBeEI7QUFDSDtBQUNETixlQUFPTyxPQUFQLENBQWU5QixJQUFmLENBQW9CTyxNQUFwQjtBQUNBYyxhQUFLdkQsUUFBTCxDQUFjSyxPQUFkLENBQXNCLFVBQVU0RCxHQUFWLEVBQWE7QUFDL0IsZ0JBQUl4QixPQUFPd0IsR0FBUCxNQUFnQixXQUFwQixFQUFpQztBQUM3QnhCLHVCQUFPd0IsR0FBUCxJQUFjLEtBQWQ7QUFDQSxvQkFBSUMsTUFDQSw4QkFBOEJSLFNBQTlCLEdBQTBDLDZCQUExQyxHQUEwRU8sR0FBMUUsR0FBZ0YsK0RBQWhGLEdBQWtKcEQsS0FBS0MsU0FBTCxDQUFlMkIsTUFBZixDQUFsSixHQUEySyxFQUQvSztBQUVBMUQseUJBQVNtRixHQUFUO0FBR0g7QUFDSixTQVREO0FBV0FYLGFBQUtZLFNBQUwsQ0FBZTlELE9BQWYsQ0FBdUIsVUFBVUwsUUFBVixFQUFrQjtBQUNyQyxnQkFBSXlDLE9BQU96QyxRQUFQLE1BQXFCbUMsU0FBekIsRUFBb0M7QUFDaENwRCx5QkFBUyw4QkFBOEIyRSxTQUE5QixHQUEwQyw2QkFBMUMsR0FBMEUxRCxRQUExRSxHQUFxRixlQUFyRixHQUF1R2EsS0FBS0MsU0FBTCxDQUFlMkIsTUFBZixDQUF2RyxHQUFnSSxFQUF6STtBQUNBO0FBQ0g7QUFDRCxnQkFBSUEsT0FBT3pDLFFBQVAsTUFBcUIsR0FBekIsRUFBOEI7QUFDMUIsb0JBQUlvRSxVQUFVM0IsT0FBT3pDLFFBQVAsQ0FBZDtBQUNBakIseUJBQVMsdUJBQXVCaUIsUUFBdkIsR0FBa0MsTUFBbEMsR0FBMkNvRSxPQUFwRDtBQUNBLG9CQUFJN0QsUUFBUTtBQUNSUCw4QkFBVUEsUUFERjtBQUVSUSxtQ0FBZTRELE9BRlA7QUFHUjNELDBCQUFNLENBSEUsQ0FHRjtBQUhFLHNCQUlSQyxNQUFNMEQsT0FKRTtBQUtSbEUsOEJBQVVBLFFBTEY7QUFNUlMsOEJBQVU7QUFORixpQkFBWjtBQVFBLG9CQUFJNEMsS0FBS2MsVUFBTCxJQUFtQmQsS0FBS2MsVUFBTCxDQUFnQkMsT0FBaEIsQ0FBd0J0RSxRQUF4QixLQUFxQyxDQUE1RCxFQUErRDtBQUMzRE8sMEJBQU15QixTQUFOLEdBQWtCLElBQWxCO0FBQ0g7QUFDRGpCLHVDQUF1QjBDLE9BQU90RCxNQUE5QixFQUFzQ0ksS0FBdEMsRUFBNkNrRCxPQUFPaEMsU0FBcEQ7QUFDQSxvQkFBSWtDLFNBQVM1RCxRQUFULElBQXFCNEQsU0FBUzVELFFBQVQsQ0FBa0JDLFFBQWxCLENBQXpCLEVBQXNEO0FBQ2xERixnQ0FBWTZELFNBQVM1RCxRQUFULENBQWtCQyxRQUFsQixDQUFaLEVBQXlDQSxRQUF6QyxFQUFtRG9FLE9BQW5ELEVBQTREbEUsUUFBNUQsRUFBc0V1RCxPQUFPdEQsTUFBN0UsRUFBcUZzRCxPQUFPaEMsU0FBNUY7QUFDSDtBQUNELG9CQUFJZ0IsT0FBTzFDLFFBQVAsSUFBbUIwQyxPQUFPMUMsUUFBUCxDQUFnQkMsUUFBaEIsQ0FBdkIsRUFBa0Q7QUFDOUNGLGdDQUFZMkMsT0FBTzFDLFFBQVAsQ0FBZ0JDLFFBQWhCLENBQVosRUFBdUNBLFFBQXZDLEVBQWlEb0UsT0FBakQsRUFBMERsRSxRQUExRCxFQUFvRXVELE9BQU90RCxNQUEzRSxFQUFtRnNELE9BQU9oQyxTQUExRjtBQUNIO0FBQ0o7QUFDSixTQTNCRDtBQTRCSCxLQS9DRDtBQWdESDtBQUtELFNBQUE4QyxTQUFBLENBQW1CakIsU0FBbkIsRUFBc0NFLFVBQXRDLEVBQTBEQyxNQUExRCxFQUFnRjtBQUM1RTFFLGFBQVMsY0FBY3lFLFVBQWQsR0FBMkIsT0FBcEM7QUFDQSxRQUFJRCxPQUFPWCxlQUFlLE9BQU9VLFNBQVAsR0FBbUIsR0FBbkIsR0FBeUJFLFVBQXpCLEdBQXNDLGFBQXJELENBQVg7QUFDQWdCLG1CQUFlaEIsVUFBZixFQUEyQkQsSUFBM0IsRUFBaUNFLE1BQWpDO0FBQ0FKLGtCQUFjQyxTQUFkLEVBQXlCQyxJQUF6QixFQUErQkMsVUFBL0IsRUFBMkNDLE1BQTNDO0FBQ0g7QUFFRCxTQUFBZ0IsaUJBQUEsQ0FBa0NiLE1BQWxDLEVBQWtESCxNQUFsRCxFQUF3RTtBQUNwRSxRQUFJaUIsUUFBUWpCLE9BQU9rQixPQUFQLENBQWVMLE9BQWYsQ0FBdUJWLE1BQXZCLENBQVo7QUFDQSxRQUFJYyxRQUFRLENBQVosRUFBZTtBQUNYQSxnQkFBUWpCLE9BQU9rQixPQUFQLENBQWVoQyxNQUF2QjtBQUNIO0FBQ0QsUUFBSStCLFNBQVMsRUFBYixFQUFpQjtBQUNiLGNBQU0sSUFBSXRDLEtBQUosQ0FBVSx5Q0FBVixDQUFOO0FBQ0g7QUFDRCxXQUFPLFVBQVVzQyxLQUFqQjtBQUNIO0FBVER6QyxRQUFBd0MsaUJBQUEsR0FBQUEsaUJBQUE7QUFXQSxTQUFBRCxjQUFBLENBQXdCaEIsVUFBeEIsRUFBNENELElBQTVDLEVBQTBERSxNQUExRCxFQUFnRjtBQUM1RSxRQUFJbUIsdUJBQXVCLEVBQTNCO0FBQ0FyQixTQUFLckQsUUFBTCxHQUFnQnVFLGtCQUFrQmxCLEtBQUtLLE1BQXZCLEVBQStCSCxNQUEvQixDQUFoQjtBQUNBRixTQUFLc0IsaUJBQUwsR0FBeUIsRUFBekI7QUFDQTtBQUNBdEIsU0FBS3ZELFFBQUwsR0FBZ0J1RCxLQUFLdkQsUUFBTCxDQUFjOEUsR0FBZCxDQUFrQixVQUFVYixHQUFWLEVBQWtCO0FBQ2hELFlBQUksT0FBT0EsR0FBUCxLQUFlLFFBQW5CLEVBQTZCO0FBQ3pCLG1CQUFPQSxHQUFQO0FBQ0g7QUFDRCxZQUFJLE9BQU9BLElBQUlGLElBQVgsS0FBb0IsUUFBeEIsRUFBa0M7QUFDOUJiLG9CQUFRQyxHQUFSLENBQVksOENBQThDdEMsS0FBS0MsU0FBTCxDQUFlbUQsR0FBZixDQUE5QyxHQUFvRSxZQUFwRSxHQUFtRlQsVUFBL0Y7QUFDQS9ELG9CQUFRMkQsSUFBUixDQUFhLENBQUMsQ0FBZDtBQUVIO0FBQ0R3Qiw2QkFBcUJYLElBQUlGLElBQXpCLElBQWlDRSxHQUFqQztBQUNBVixhQUFLc0IsaUJBQUwsQ0FBdUIzQyxJQUF2QixDQUE0QitCLEdBQTVCO0FBQ0EsZUFBT0EsSUFBSUYsSUFBWDtBQUNILEtBWmUsQ0FBaEI7QUFjQTtBQUNBUixTQUFLdkQsUUFBTCxDQUFjSyxPQUFkLENBQXNCLFVBQVVMLFFBQVYsRUFBa0I7QUFDcENlLCtCQUF1QjBDLE9BQU90RCxNQUE5QixFQUFzQztBQUNsQ0gsc0JBQVUsVUFEd0I7QUFFbENRLDJCQUFlUixRQUZtQjtBQUdsQ1Msa0JBQU0sQ0FINEIsQ0FHNUI7QUFINEIsY0FJbENDLE1BQU1WLFFBSjRCO0FBS2xDNEIsMkJBQWU1QixTQUFTc0MsV0FBVCxFQUxtQjtBQU1sQ3BDLHNCQUFVcUQsS0FBS3JELFFBTm1CO0FBT2xDUyxzQkFBVTtBQVB3QixTQUF0QyxFQVFHOEMsT0FBT2hDLFNBUlY7QUFTSCxLQVZEO0FBWUEsUUFBSWdDLE9BQU9rQixPQUFQLENBQWVMLE9BQWYsQ0FBdUJmLEtBQUtLLE1BQTVCLEtBQXVDLENBQTNDLEVBQThDO0FBQzFDN0UsaUJBQVMsd0JBQXdCOEIsS0FBS0MsU0FBTCxDQUFleUMsSUFBZixFQUFxQnBCLFNBQXJCLEVBQWdDLENBQWhDLENBQWpDO0FBQ0EsY0FBTSxJQUFJQyxLQUFKLENBQVUsWUFBWW1CLEtBQUtLLE1BQWpCLEdBQTBCLGdDQUExQixHQUE2REosVUFBN0QsR0FBMEUsR0FBcEYsQ0FBTjtBQUNIO0FBQ0Q7QUFDQXVCLFdBQU9DLElBQVAsQ0FBWXpCLElBQVosRUFBa0IwQixJQUFsQixHQUF5QjVFLE9BQXpCLENBQWlDLFVBQVU2RSxTQUFWLEVBQW1CO0FBQ2hELFlBQUlyRixxQkFBcUJ5RSxPQUFyQixDQUE2QlksU0FBN0IsSUFBMEMsQ0FBOUMsRUFBaUQ7QUFDN0Msa0JBQU0sSUFBSTlDLEtBQUosQ0FBVSxxQkFBcUI4QyxTQUFyQixHQUFpQyxrREFBakMsR0FBc0YzQixLQUFLSyxNQUEzRixHQUFvRyxHQUE5RyxDQUFOO0FBQ0g7QUFDSixLQUpEO0FBS0E7QUFDQUgsV0FBTzBCLFNBQVAsQ0FBaUI1QixLQUFLSyxNQUF0QixJQUFnQ0wsSUFBaEM7QUFFQUUsV0FBTzJCLElBQVAsQ0FBWXhCLE1BQVosQ0FBbUJMLEtBQUtLLE1BQXhCLElBQWtDO0FBQzlCeUIscUJBQWE5QixLQUFLOEIsV0FEWTtBQUU5QkMsb0JBQVlWLG9CQUZrQjtBQUc5QjFFLGtCQUFVcUQsS0FBS3JEO0FBSGUsS0FBbEM7QUFNQTtBQUdBO0FBQ0FxRCxTQUFLWSxTQUFMLEdBQWlCWixLQUFLWSxTQUFMLElBQWtCLEVBQW5DO0FBQ0FaLFNBQUtZLFNBQUwsQ0FBZTlELE9BQWYsQ0FBdUIsVUFBVWtGLFVBQVYsRUFBb0I7QUFDdkMsWUFBSWhDLEtBQUt2RCxRQUFMLENBQWNzRSxPQUFkLENBQXNCaUIsVUFBdEIsSUFBb0MsQ0FBeEMsRUFBMkM7QUFDdkMsa0JBQU0sSUFBSW5ELEtBQUosQ0FBVSxzQkFBc0JtRCxVQUF0QixHQUFtQyw2QkFBbkMsR0FBbUVoQyxLQUFLSyxNQUF4RSxHQUFpRixHQUEzRixDQUFOO0FBQ0g7QUFDSixLQUpEO0FBS0FMLFNBQUtjLFVBQUwsR0FBa0JkLEtBQUtjLFVBQUwsSUFBbUIsRUFBckM7QUFDQWQsU0FBS2MsVUFBTCxDQUFnQmhFLE9BQWhCLENBQXdCLFVBQVVtRixXQUFWLEVBQXFCO0FBQ3pDLFlBQUlqQyxLQUFLdkQsUUFBTCxDQUFjc0UsT0FBZCxDQUFzQmtCLFdBQXRCLElBQXFDLENBQXpDLEVBQTRDO0FBQ3hDLGtCQUFNLElBQUlwRCxLQUFKLENBQVUsdUJBQXVCb0QsV0FBdkIsR0FBcUMsNkJBQXJDLEdBQXFFakMsS0FBS0ssTUFBMUUsR0FBbUYsR0FBN0YsQ0FBTjtBQUNIO0FBQ0osS0FKRDtBQUtBTCxTQUFLa0MsT0FBTCxHQUFlbEMsS0FBS2tDLE9BQUwsSUFBZ0IsRUFBL0I7QUFDQWxDLFNBQUtrQyxPQUFMLENBQWFwRixPQUFiLENBQXFCLFVBQVVtRixXQUFWLEVBQXFCO0FBQ3RDLFlBQUlqQyxLQUFLdkQsUUFBTCxDQUFjc0UsT0FBZCxDQUFzQmtCLFdBQXRCLElBQXFDLENBQXpDLEVBQTRDO0FBQ3hDLGtCQUFNLElBQUlwRCxLQUFKLENBQVUsbUJBQW1Cb0QsV0FBbkIsR0FBaUMsNkJBQWpDLEdBQWlFakMsS0FBS0ssTUFBdEUsR0FBK0UsR0FBekYsQ0FBTjtBQUNIO0FBQ0osS0FKRDtBQU9BO0FBQ0EsUUFBSThCLFlBQVlDLE1BQU1DLE1BQU4sQ0FBYXJDLEtBQUtLLE1BQWxCLEVBQTBCaUMsWUFBMUIsRUFBaEI7QUFDQSxRQUFJQyxjQUFjSCxNQUFNSSxRQUFOLENBQWV6RyxLQUFLMEcsb0JBQXBCLEVBQTBDSCxZQUExQyxFQUFsQjtBQUNBLFFBQUlJLHFCQUFxQk4sTUFBTUksUUFBTixDQUFlekcsS0FBSzRHLHFCQUFwQixFQUEyQ0wsWUFBM0MsRUFBekI7QUFDQXRDLFNBQUt2RCxRQUFMLENBQWNLLE9BQWQsQ0FBc0IsVUFBVThGLFNBQVYsRUFBbUI7QUFFckMsWUFBSUMsaUJBQWlCVCxNQUFNVSxRQUFOLENBQWVGLFNBQWYsRUFBMEJOLFlBQTFCLEVBQXJCO0FBQ0FwQyxlQUFPNkMsSUFBUCxDQUFZQyxFQUFaLENBQWViLFNBQWYsSUFBNEJqQyxPQUFPNkMsSUFBUCxDQUFZQyxFQUFaLENBQWViLFNBQWYsS0FBNkIsRUFBekQ7QUFDQWpDLGVBQU82QyxJQUFQLENBQVlDLEVBQVosQ0FBZWIsU0FBZixFQUEwQkksV0FBMUIsSUFBeUNyQyxPQUFPNkMsSUFBUCxDQUFZQyxFQUFaLENBQWViLFNBQWYsRUFBMEJJLFdBQTFCLEtBQTBDLEVBQW5GO0FBQ0FyQyxlQUFPNkMsSUFBUCxDQUFZQyxFQUFaLENBQWViLFNBQWYsRUFBMEJJLFdBQTFCLEVBQXVDTSxjQUF2QyxJQUF5RCxFQUF6RDtBQUVBM0MsZUFBTzZDLElBQVAsQ0FBWUMsRUFBWixDQUFlSCxjQUFmLElBQWlDM0MsT0FBTzZDLElBQVAsQ0FBWUMsRUFBWixDQUFlSCxjQUFmLEtBQWtDLEVBQW5FO0FBQ0EzQyxlQUFPNkMsSUFBUCxDQUFZQyxFQUFaLENBQWVILGNBQWYsRUFBK0JILGtCQUEvQixJQUFxRHhDLE9BQU82QyxJQUFQLENBQVlDLEVBQVosQ0FBZUgsY0FBZixFQUErQkgsa0JBQS9CLEtBQXNELEVBQTNHO0FBQ0F4QyxlQUFPNkMsSUFBUCxDQUFZQyxFQUFaLENBQWVILGNBQWYsRUFBK0JILGtCQUEvQixFQUFtRFAsU0FBbkQsSUFBZ0UsRUFBaEU7QUFFSCxLQVhEO0FBYUE7QUFDQTNFLDJCQUF1QjBDLE9BQU90RCxNQUE5QixFQUFzQztBQUNsQ0gsa0JBQVUsUUFEd0I7QUFFbENRLHVCQUFlK0MsS0FBS0ssTUFGYztBQUdsQ25ELGNBQU0sQ0FINEIsQ0FHNUI7QUFINEIsVUFJbENDLE1BQU02QyxLQUFLSyxNQUp1QjtBQUtsQzFELGtCQUFVcUQsS0FBS3JELFFBTG1CO0FBTWxDUyxrQkFBVTtBQU53QixLQUF0QyxFQU9HOEMsT0FBT2hDLFNBUFY7QUFTQTtBQUNBLFFBQUk4QixLQUFLTyxJQUFMLElBQWFQLEtBQUtPLElBQUwsQ0FBVTBDLFFBQTNCLEVBQXFDO0FBQ2pDLFlBQUlBLFdBQVd6QixPQUFPQyxJQUFQLENBQVl6QixLQUFLTyxJQUFMLENBQVUwQyxRQUFWLElBQXNCLEVBQWxDLENBQWY7QUFDQSxZQUFJQyxPQUFPL0csRUFBRWdILFVBQUYsQ0FBYUYsUUFBYixFQUF1QmpELEtBQUt2RCxRQUE1QixDQUFYO0FBQ0EsWUFBSXlHLEtBQUs5RCxNQUFMLEdBQWMsQ0FBbEIsRUFBcUI7QUFDakJPLG9CQUFRQyxHQUFSLENBQVksTUFBSUksS0FBS0ssTUFBVCxHQUFlLDRDQUFmLEdBQTZENkMsS0FBS0UsSUFBTCxDQUFVLEdBQVYsQ0FBN0QsR0FBOEUsR0FBMUY7QUFDQWxILG9CQUFRMkQsSUFBUixDQUFhLENBQUMsQ0FBZDtBQUNIO0FBQ0QsWUFBSXdELFdBQVc3QixPQUFPQyxJQUFQLENBQVl6QixLQUFLTyxJQUFMLENBQVU4QyxRQUF0QixDQUFmO0FBQ0FILGVBQU8vRyxFQUFFZ0gsVUFBRixDQUFhRSxRQUFiLEVBQXVCckQsS0FBS3ZELFFBQTVCLENBQVA7QUFDQSxZQUFJeUcsS0FBSzlELE1BQUwsR0FBYyxDQUFsQixFQUFxQjtBQUNqQk8sb0JBQVFDLEdBQVIsQ0FBWSxNQUFJSSxLQUFLSyxNQUFULEdBQWUseUNBQWYsR0FBMEQ2QyxLQUFLRSxJQUFMLENBQVUsR0FBVixDQUExRCxHQUEyRSxHQUF2RjtBQUNBbEgsb0JBQVEyRCxJQUFSLENBQWEsQ0FBQyxDQUFkO0FBQ0g7QUFDRDJCLGVBQU9DLElBQVAsQ0FBWXpCLEtBQUtPLElBQUwsQ0FBVStDLElBQVYsSUFBa0IsRUFBOUIsRUFBa0N4RyxPQUFsQyxDQUEwQyxVQUFVeUcsS0FBVixFQUFlO0FBQ3JELGdCQUFJTCxPQUFPL0csRUFBRWdILFVBQUYsQ0FBYW5ELEtBQUtPLElBQUwsQ0FBVStDLElBQVYsQ0FBZUMsS0FBZixFQUFzQkMsR0FBbkMsRUFBd0N4RCxLQUFLdkQsUUFBN0MsQ0FBWDtBQUNBLGdCQUFJeUcsS0FBSzlELE1BQUwsR0FBYyxDQUFsQixFQUFxQjtBQUNqQk8sd0JBQVFDLEdBQVIsQ0FBWSxNQUFJSSxLQUFLSyxNQUFULEdBQWUsOEJBQWYsR0FBOENrRCxLQUE5QyxHQUFtRCxjQUFuRCxHQUFtRUwsS0FBS0UsSUFBTCxDQUFVLEdBQVYsQ0FBbkUsR0FBb0YsR0FBaEc7QUFDQWxILHdCQUFRMkQsSUFBUixDQUFhLENBQUMsQ0FBZDtBQUNIO0FBQ0osU0FORDtBQVFBO0FBQ0FLLGVBQU91RCxLQUFQLENBQWF4RSxNQUFiLENBQW9CLFVBQVVDLE1BQVYsRUFBZ0I7QUFDaEMsZ0JBQUlBLE9BQU9zQixJQUFQLE1BQWlCUixLQUFLTyxJQUFMLElBQWFQLEtBQUtPLElBQUwsQ0FBVUMsSUFBeEMsQ0FBSixFQUFtRDtBQUMvQ2Isd0JBQVFDLEdBQVIsQ0FBWSxVQUFVSSxLQUFLTyxJQUFMLENBQVVDLElBQXBCLEdBQTJCLGdDQUEzQixHQUE4RFAsVUFBMUU7QUFDQTtBQUNBL0Qsd0JBQVEyRCxJQUFSLENBQWEsQ0FBQyxDQUFkO0FBQ0g7QUFDSixTQU5EO0FBT0gsS0E3QkQsTUE2Qk87QUFDSEcsYUFBSzBELFVBQUwsR0FBa0IsSUFBbEI7QUFDQTFELGFBQUtPLElBQUwsQ0FBVTBDLFFBQVYsR0FBcUIsRUFBRSxjQUFjLEVBQWhCLEVBQXJCO0FBQ0g7QUFDRDtBQUNBLFFBQUksQ0FBQ2pELEtBQUswRCxVQUFOLElBQW9CMUQsS0FBS08sSUFBekIsSUFBaUNQLEtBQUtPLElBQUwsQ0FBVUMsSUFBL0MsRUFBcUQ7QUFDakRoRCwrQkFBdUIwQyxPQUFPdEQsTUFBOUIsRUFBc0M7QUFDbENILHNCQUFVLE1BRHdCO0FBRWxDUSwyQkFBZStDLEtBQUtPLElBQUwsQ0FBVUMsSUFGUztBQUdsQ3RELGtCQUFNLENBSDRCLENBRzVCO0FBSDRCLGNBSWxDQyxNQUFNNkMsS0FBS08sSUFBTCxDQUFVQyxJQUprQjtBQUtsQzdELHNCQUFVcUQsS0FBS3JELFFBTG1CO0FBTWxDUyxzQkFBVTtBQU53QixTQUF0QyxFQU9HOEMsT0FBT2hDLFNBUFY7QUFRSDtBQUFBO0FBQ0QsUUFBSThCLEtBQUt4RCxRQUFMLElBQWlCd0QsS0FBS3hELFFBQUwsQ0FBYyxNQUFkLENBQXJCLEVBQTRDO0FBQ3hDRCxvQkFBWXlELEtBQUt4RCxRQUFMLENBQWMsTUFBZCxDQUFaLEVBQW1DLE1BQW5DLEVBQTJDd0QsS0FBS08sSUFBTCxDQUFVQyxJQUFyRCxFQUEyRFIsS0FBS3JELFFBQWhFLEVBQTBFdUQsT0FBT3RELE1BQWpGLEVBQXlGc0QsT0FBT2hDLFNBQWhHO0FBQ0g7QUFBQTtBQUNELFFBQUk4QixLQUFLeEQsUUFBVCxFQUFtQjtBQUNmZ0YsZUFBT0MsSUFBUCxDQUFZekIsS0FBS3hELFFBQWpCLEVBQTJCTSxPQUEzQixDQUFtQyxVQUFVNkcsT0FBVixFQUFpQjtBQUNoRCxnQkFBSTNELEtBQUt2RCxRQUFMLENBQWNzRSxPQUFkLENBQXNCNEMsT0FBdEIsS0FBa0MsQ0FBbEMsSUFBdUNBLFlBQVksTUFBdkQsRUFBK0Q7QUFDM0Qsb0JBQUl6RCxPQUFPMkIsSUFBUCxDQUFZeEIsTUFBWixDQUFtQkwsS0FBS0ssTUFBeEIsRUFBZ0MwQixVQUFoQyxDQUEyQzRCLE9BQTNDLENBQUosRUFBeUQ7QUFDckR6RCwyQkFBTzJCLElBQVAsQ0FBWXhCLE1BQVosQ0FBbUJMLEtBQUtLLE1BQXhCLEVBQWdDMEIsVUFBaEMsQ0FBMkM0QixPQUEzQyxFQUFvRG5ILFFBQXBELEdBQStEd0QsS0FBS3hELFFBQUwsQ0FBY21ILE9BQWQsQ0FBL0Q7QUFDSDtBQUVEcEgsNEJBQVl5RCxLQUFLeEQsUUFBTCxDQUFjbUgsT0FBZCxDQUFaLEVBQW9DLFVBQXBDLEVBQWdEQSxPQUFoRCxFQUF5RDNELEtBQUtyRCxRQUE5RCxFQUF3RXVELE9BQU90RCxNQUEvRSxFQUF1RnNELE9BQU9oQyxTQUE5RjtBQUNIO0FBQ0osU0FSRDtBQVNIO0FBQ0RnQyxXQUFPa0IsT0FBUCxDQUFlekMsSUFBZixDQUFvQnFCLEtBQUtLLE1BQXpCO0FBQ0EsUUFBSUwsS0FBS08sSUFBTCxDQUFVQyxJQUFkLEVBQW9CO0FBQ2hCTixlQUFPdUQsS0FBUCxDQUFhOUUsSUFBYixDQUFrQnFCLEtBQUtPLElBQXZCO0FBQ0g7QUFDREwsV0FBT3pELFFBQVAsR0FBa0J5RCxPQUFPekQsUUFBUCxDQUFnQm1ILE1BQWhCLENBQXVCNUQsS0FBS3ZELFFBQTVCLENBQWxCO0FBQ0F5RCxXQUFPekQsUUFBUCxDQUFnQmlGLElBQWhCO0FBQ0F4QixXQUFPekQsUUFBUCxHQUFrQnlELE9BQU96RCxRQUFQLENBQWdCd0MsTUFBaEIsQ0FBdUIsVUFBVTRFLE1BQVYsRUFBa0IxQyxLQUFsQixFQUF1QjtBQUM1RCxlQUFPakIsT0FBT3pELFFBQVAsQ0FBZ0IwRSxLQUFoQixNQUEyQmpCLE9BQU96RCxRQUFQLENBQWdCMEUsUUFBUSxDQUF4QixDQUFsQztBQUNILEtBRmlCLENBQWxCO0FBSUgsQyxDQUFDO0FBRUYsU0FBQTJDLFVBQUEsQ0FBMkJDLEtBQTNCLEVBQWdEO0FBQzVDLFFBQUlDLE1BQU0sRUFBVjtBQUNBLFFBQUlDLGVBQWUsRUFBbkI7QUFDQUYsVUFBTWpILE9BQU4sQ0FBYyxVQUFVWSxJQUFWLEVBQWM7QUFDeEIsWUFBSUEsS0FBS1IsSUFBTCxLQUFjLENBQWxCLENBQWtCLFVBQWxCLEVBQTRDO0FBQ3hDLG9CQUFJLENBQUNRLEtBQUtXLGFBQVYsRUFBeUI7QUFDckIsMEJBQU0sSUFBSVEsS0FBSixDQUFVLHFDQUFxQ3ZCLEtBQUtDLFNBQUwsQ0FBZUcsSUFBZixDQUEvQyxDQUFOO0FBQ0g7QUFDRHNHLG9CQUFJdEcsS0FBS1csYUFBVCxJQUEwQjJGLElBQUl0RyxLQUFLVyxhQUFULEtBQTJCLEVBQUUxQixVQUFVLENBQVosRUFBZW9ILE9BQU8sRUFBdEIsRUFBckQ7QUFDQUMsb0JBQUl0RyxLQUFLVyxhQUFULEVBQXdCMUIsUUFBeEIsR0FBbUNxSCxJQUFJdEcsS0FBS1csYUFBVCxFQUF3QjFCLFFBQXhCLEdBQW1DZSxLQUFLZixRQUEzRTtBQUNBcUgsb0JBQUl0RyxLQUFLVyxhQUFULEVBQXdCMEYsS0FBeEIsQ0FBOEJwRixJQUE5QixDQUFtQ2pCLElBQW5DO0FBQ0gsYUFQRCxNQU9PO0FBQ0h1Ryx5QkFBYXRGLElBQWIsQ0FBa0JqQixJQUFsQjtBQUNIO0FBQ0osS0FYRDtBQVlBLFdBQU87QUFDSHdHLGlCQUFTRixHQUROO0FBRUhDLHNCQUFjQSxZQUZYO0FBR0hFLGtCQUFVSixLQUhQO0FBSUhLLG1CQUFZO0FBSlQsS0FBUDtBQU1IO0FBckJEMUYsUUFBQW9GLFVBQUEsR0FBQUEsVUFBQTtBQXVCQSxTQUFBTyxhQUFBLENBQXVCQyxDQUF2QixFQUFrQ0MsQ0FBbEMsRUFBMkM7QUFDdkMsUUFBSUMsSUFBSUYsRUFBRWxGLE1BQUYsR0FBV21GLEVBQUVuRixNQUFyQjtBQUNBLFFBQUlvRixDQUFKLEVBQU87QUFDSCxlQUFPQSxDQUFQO0FBQ0g7QUFDRCxXQUFPRixFQUFFRyxhQUFGLENBQWdCRixDQUFoQixDQUFQO0FBQ0g7QUFFRCxJQUFBRyxXQUFBbkosUUFBQSw2QkFBQSxDQUFBO0FBQ0EsSUFBQW9KLFFBQUFwSixRQUFBLGdCQUFBLENBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQSxTQUFBcUosV0FBQSxDQUE0QkMsU0FBNUIsRUFBK0NDLEdBQS9DLEVBQThEQyxPQUE5RCxFQUErRTtBQUMzRUEsWUFBUUMsS0FBUjtBQUNBLFNBQUssSUFBSUMsSUFBSUYsUUFBUSxDQUFSLENBQWIsRUFBMEJFLElBQUlILElBQUkxRixNQUFULElBQXFCMEYsSUFBSUcsQ0FBSixFQUFPN0YsTUFBUCxJQUFpQnlGLFNBQS9ELEVBQTJFLEVBQUVJLENBQTdFLEVBQWdGLENBRS9FO0FBQ0Q7QUFDQUYsWUFBUXBHLElBQVIsQ0FBYXNHLENBQWI7QUFDSDtBQVBEdkcsUUFBQWtHLFdBQUEsR0FBQUEsV0FBQTtBQVNBLFNBQUFNLDBCQUFBLENBQTJDbkIsS0FBM0MsRUFBa0VvQixNQUFsRSxFQUFrRkMsVUFBbEYsRUFBOEdDLGtCQUE5RyxFQUFrSm5ILFNBQWxKLEVBQTJKO0FBQ3ZKa0gsZUFBV3RJLE9BQVgsQ0FBbUIsVUFBQXdJLFNBQUEsRUFBUztBQUN4QixZQUFJaEgsVUFBVWtELE9BQU8rRCxNQUFQLENBQWMsRUFBZCxFQUFrQkQsU0FBbEIsQ0FBZDtBQUNBaEgsZ0JBQVFELGFBQVIsR0FBd0I4RyxNQUF4QjtBQUNBN0csZ0JBQVFuQixJQUFSLEdBQWVnSSxNQUFmO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFJSyxNQUFNekIsTUFBTTNFLE1BQWhCO0FBQ0E1QiwrQkFBdUJ1RyxLQUF2QixFQUE4QnpGLE9BQTlCLEVBQXVDSixTQUF2QztBQUNILEtBVkQ7QUFXSDtBQVpEUSxRQUFBd0csMEJBQUEsR0FBQUEsMEJBQUE7QUFlQSxTQUFBTyx1QkFBQSxDQUF3QzFCLEtBQXhDLEVBQStEN0YsU0FBL0QsRUFBd0U7QUFDcEUsUUFBSXdILFVBQVUsRUFBZDtBQUNBLFFBQUlDLGVBQWUsRUFBbkI7QUFDQTVCLFVBQU1qSCxPQUFOLENBQWMsVUFBQVksSUFBQSxFQUFJO0FBQ2QsWUFBSUEsS0FBS1IsSUFBTCxLQUFjLENBQWxCLENBQWtCLFVBQWxCLEVBQTRDO0FBQ3hDO0FBQ0F3SSx3QkFBUWhJLEtBQUtXLGFBQWIsSUFBOEJxSCxRQUFRaEksS0FBS1csYUFBYixLQUErQixFQUE3RDtBQUNBcUgsd0JBQVFoSSxLQUFLVyxhQUFiLEVBQTRCTSxJQUE1QixDQUFpQ2pCLElBQWpDO0FBQ0Esb0JBQUksQ0FBQ0EsS0FBS2UsU0FBTixJQUFtQmYsS0FBS0UsS0FBNUIsRUFBbUM7QUFDL0IrSCxpQ0FBYWpJLEtBQUtXLGFBQWxCLElBQW1Dc0gsYUFBYWpJLEtBQUtXLGFBQWxCLEtBQW9DLEVBQXZFO0FBQ0FzSCxpQ0FBYWpJLEtBQUtXLGFBQWxCLEVBQWlDTSxJQUFqQyxDQUFzQ2pCLElBQXRDO0FBQ0g7QUFDSjtBQUNKLEtBVkQ7QUFXQSxRQUFJK0QsT0FBT0QsT0FBT0MsSUFBUCxDQUFZaUUsT0FBWixDQUFYO0FBQ0FqRSxTQUFLQyxJQUFMLENBQVUyQyxhQUFWO0FBQ0EsUUFBSXVCLE1BQU0sQ0FBVjtBQUNBbkUsU0FBSzNFLE9BQUwsQ0FBYSxVQUFDK0ksR0FBRCxFQUFNMUUsS0FBTixFQUFXO0FBQ3BCLFlBQUkwRSxJQUFJekcsTUFBSixJQUFjd0csR0FBbEIsRUFBdUIsQ0FFdEI7QUFDREEsY0FBTUMsSUFBSXpHLE1BQVY7QUFDSCxLQUxEO0FBTUE7QUFDQSxRQUFJMEcsWUFBWXRFLE9BQU9DLElBQVAsQ0FBWWtFLFlBQVosQ0FBaEI7QUFDQUcsY0FBVXBFLElBQVYsQ0FBZTJDLGFBQWY7QUFDQTtBQUNBLFFBQUl2RyxNQUFNLENBQVY7QUFDQSxRQUFJQyxPQUFPLENBQVg7QUFDQSxRQUFJZ0ksVUFBVSxDQUFkO0FBQ0EsUUFBSWhCLFVBQVUsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsRUFBVSxDQUFWLEVBQWEsQ0FBYixFQUFnQixDQUFoQixDQUFkO0FBQ0EsUUFBSWEsTUFBTUUsVUFBVTFHLE1BQXBCO0FBQ0F3RixnQkFBWSxDQUFaLEVBQWVuRCxJQUFmLEVBQXFCc0QsT0FBckI7QUFDQUgsZ0JBQVksQ0FBWixFQUFlbkQsSUFBZixFQUFxQnNELE9BQXJCO0FBQ0FILGdCQUFZLENBQVosRUFBZW5ELElBQWYsRUFBcUJzRCxPQUFyQjtBQUVBZSxjQUFVaEosT0FBVixDQUFrQixVQUFVa0osUUFBVixFQUFrQjtBQUNoQyxZQUFJQSxTQUFTNUcsTUFBVCxLQUFvQjJHLE9BQXhCLEVBQWlDO0FBQzdCLGlCQUFLZCxJQUFJYyxVQUFVLENBQW5CLEVBQXNCZCxLQUFLZSxTQUFTNUcsTUFBcEMsRUFBNEMsRUFBRTZGLENBQTlDLEVBQWlEO0FBQzdDTCw0QkFBWUssSUFBSSxDQUFoQixFQUFtQnhELElBQW5CLEVBQXlCc0QsT0FBekI7QUFDSDtBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0FnQixzQkFBVUMsU0FBUzVHLE1BQW5CO0FBQ0g7QUFDRCxhQUFLLElBQUk2RixJQUFJRixRQUFRLENBQVIsQ0FBYixFQUF5QkUsSUFBSUYsUUFBUSxDQUFSLENBQTdCLEVBQXlDLEVBQUVFLENBQTNDLEVBQThDO0FBQzFDLGdCQUFJVCxJQUFJRSxTQUFTdUIsb0JBQVQsQ0FBOEJELFFBQTlCLEVBQXdDdkUsS0FBS3dELENBQUwsQ0FBeEMsQ0FBUjtBQUNBO0FBQ0EsZ0JBQUtULE1BQU0sR0FBUCxJQUFnQkEsS0FBS0csTUFBTXVCLHNCQUEvQixFQUF3RDtBQUNwRDtBQUNBLG9CQUFJVixNQUFNekIsTUFBTTNFLE1BQWhCO0FBQ0E7QUFDQThGLDJDQUEyQm5CLEtBQTNCLEVBQWtDdEMsS0FBS3dELENBQUwsQ0FBbEMsRUFBMkNVLGFBQWFLLFFBQWIsQ0FBM0MsRUFBbUVOLFFBQVFqRSxLQUFLd0QsQ0FBTCxDQUFSLENBQW5FLEVBQXFGL0csU0FBckY7QUFDQSxvQkFBSTZGLE1BQU0zRSxNQUFOLEdBQWVvRyxHQUFuQixFQUF3QixDQUV2QjtBQUVKO0FBQ0o7QUFDSixLQXpCRDtBQTBCQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9CSDtBQWxGRDlHLFFBQUErRyx1QkFBQSxHQUFBQSx1QkFBQTtBQW1GQSxJQUFJVSxJQUFJLENBQVI7QUFFQSxTQUFBQyxVQUFBLENBQTJCckcsU0FBM0IsRUFBNkM7QUFDekMsUUFBSUcsTUFBSjtBQUNBQSxhQUFTO0FBQ0wyQixjQUFNLEVBQUV4QixRQUFRLEVBQVYsRUFERDtBQUVMdUIsbUJBQVcsRUFGTjtBQUdMUixpQkFBUyxFQUhKO0FBSUxxQyxlQUFPLEVBSkY7QUFLTE0sZUFBT25GLFNBTEY7QUFNTG5DLGtCQUFVLEVBTkw7QUFPTDRKLG1CQUFXLEVBUE47QUFRTHpKLGdCQUFRLEVBUkg7QUFTTHNCLG1CQUFXLEVBVE47QUFVTHVDLGlCQUFTLEVBVko7QUFXTHNDLGNBQU0sRUFBRUMsSUFBSSxFQUFOO0FBWEQsS0FBVDtBQWFBLFFBQUlzRCxJQUFJQyxLQUFLQyxHQUFMLEVBQVI7QUFDQXpHLGdCQUFZQSxhQUFhM0QsWUFBekI7QUFFQSxRQUFJO0FBQ0EsWUFBSWtJLElBQUlySSxZQUFZd0ssSUFBWixDQUFpQixPQUFPMUcsU0FBUCxHQUFtQixpQkFBcEMsQ0FBUjtBQUNBO0FBQ0E7QUFDQSxZQUFJdUUsQ0FBSixFQUFPO0FBQ0g5SSxxQkFBUywwQkFBVDtBQUNBLGdCQUFJVSxRQUFRRyxHQUFSLENBQVlxSyxlQUFoQixFQUFpQztBQUM3Qi9HLHdCQUFRQyxHQUFSLENBQVksa0NBQWtDMkcsS0FBS0MsR0FBTCxLQUFhRixDQUEvQyxJQUFvRCxHQUFoRTtBQUNIO0FBQ0QsbUJBQU9oQyxDQUFQO0FBQ0g7QUFDSixLQVhELENBV0UsT0FBTzVFLENBQVAsRUFBVSxDQUdYO0FBQ0QsUUFBSWlILE9BQU90SCxlQUFlLE9BQU9VLFNBQVAsR0FBbUIsY0FBbEMsQ0FBWDtBQUNBNEcsU0FBSzdKLE9BQUwsQ0FBYSxVQUFVbUQsVUFBVixFQUFvQjtBQUM3QmUsa0JBQVVqQixTQUFWLEVBQXFCRSxVQUFyQixFQUFpQ0MsTUFBakM7QUFDSCxLQUZEO0FBSUE7QUFDQTs7Ozs7Ozs7Ozs7OztBQWNBLFFBQUkwRyxlQUFlMUYsa0JBQWtCLE1BQWxCLEVBQTBCaEIsTUFBMUIsQ0FBbkI7QUFFQTtBQUNBMUMsMkJBQXVCMEMsT0FBT3RELE1BQTlCLEVBQXNDO0FBQ2xDSCxrQkFBVSxNQUR3QjtBQUVsQ1EsdUJBQWUsUUFGbUI7QUFHbENDLGNBQU0sQ0FINEIsQ0FHNUI7QUFINEIsVUFJbENDLE1BQU0sUUFKNEI7QUFLbENSLGtCQUFVaUssWUFMd0I7QUFNbEN4SixrQkFBVTtBQU53QixLQUF0QyxFQU9HOEMsT0FBT2hDLFNBUFY7QUFVQSxRQUFJMkksaUJBQWlCM0Ysa0JBQWtCLE1BQWxCLEVBQTBCaEIsTUFBMUIsQ0FBckI7QUFDQTtBQUNBLFFBQUk0RyxVQUFXekgsZUFBZSxPQUFPVSxTQUFQLEdBQW1CLGNBQWxDLENBQWY7QUFDQSxRQUFJZ0gsS0FBSyxRQUFRRCxRQUFRMUQsSUFBUixDQUFhLEtBQWIsQ0FBUixHQUE4QixLQUF2QztBQUNBbEQsV0FBT3RELE1BQVAsQ0FBYytCLElBQWQsQ0FBbUI7QUFDZmxDLGtCQUFVLFFBREs7QUFFZlMsY0FBTSxDQUZTLENBRVQ7QUFGUyxVQUdmOEosUUFBUSxJQUFJQyxNQUFKLENBQVdGLEVBQVgsRUFBZSxHQUFmLENBSE87QUFJZjlKLHVCQUFlLFFBSkE7QUFLZk4sa0JBQVVrSyxjQUxLO0FBTWZ6SixrQkFBVTtBQU5LLEtBQW5CO0FBU0E7QUFDQSxRQUFJaUosWUFBWWhILGVBQWUsa0NBQWYsQ0FBaEI7QUFDQSxRQUFJNkgsbUJBQW1CaEcsa0JBQWtCLFdBQWxCLEVBQStCaEIsTUFBL0IsQ0FBdkI7QUFDQXNCLFdBQU9DLElBQVAsQ0FBWTRFLFVBQVVBLFNBQXRCLEVBQWlDdkosT0FBakMsQ0FBeUMsVUFBVXFLLFFBQVYsRUFBa0I7QUFDdkQsWUFBSXhMLE9BQU95TCxjQUFQLENBQXNCckcsT0FBdEIsQ0FBOEJvRyxRQUE5QixJQUEwQyxDQUE5QyxFQUFpRDtBQUM3QzNMLHFCQUFTLHNCQUFzQjJMLFFBQS9CO0FBQ0Esa0JBQU0sSUFBSXRJLEtBQUosQ0FBVSxzQkFBc0JzSSxRQUFoQyxDQUFOO0FBQ0g7QUFDRGpILGVBQU9tRyxTQUFQLENBQWlCYyxRQUFqQixJQUE2QmQsVUFBVUEsU0FBVixDQUFvQmMsUUFBcEIsQ0FBN0I7QUFDQWpILGVBQU9tRyxTQUFQLENBQWlCYyxRQUFqQixFQUEyQkEsUUFBM0IsR0FBMkRBLFFBQTNEO0FBQ0EzRixlQUFPNkYsTUFBUCxDQUFjbkgsT0FBT21HLFNBQVAsQ0FBaUJjLFFBQWpCLENBQWQ7QUFDQSxZQUFJaEssT0FBT2dLLFFBQVg7QUFDQTNKLCtCQUF1QjBDLE9BQU90RCxNQUE5QixFQUFzQztBQUNsQ0gsc0JBQVUsVUFEd0I7QUFFbENVLGtCQUFNQSxLQUFLNEIsV0FBTCxFQUY0QjtBQUdsQ1YsMkJBQWVsQixLQUFLNEIsV0FBTCxFQUhtQjtBQUlsQzdCLGtCQUFNLENBSjRCLENBSTVCO0FBSjRCLGNBS2xDRCxlQUFlRSxJQUxtQjtBQU1sQ1Isc0JBQVV1SyxnQkFOd0I7QUFPbEM5SixzQkFBVTtBQVB3QixTQUF0QyxFQVFHOEMsT0FBT2hDLFNBUlY7QUFTQTtBQUNBLFlBQUltSSxVQUFVN0osUUFBVixDQUFtQjJLLFFBQW5CLENBQUosRUFBa0M7QUFDOUIzRixtQkFBT0MsSUFBUCxDQUFZNEUsVUFBVTdKLFFBQVYsQ0FBbUIySyxRQUFuQixDQUFaLEVBQTBDckssT0FBMUMsQ0FBa0QsVUFBVXdLLE9BQVYsRUFBaUI7QUFDL0Q5Six1Q0FBdUIwQyxPQUFPdEQsTUFBOUIsRUFBc0M7QUFDbENILDhCQUFVLFVBRHdCO0FBRWxDVSwwQkFBTW1LLFFBQVF2SSxXQUFSLEVBRjRCO0FBR2xDVixtQ0FBZWlKLFFBQVF2SSxXQUFSLEVBSG1CO0FBSWxDN0IsMEJBQU0sQ0FKNEIsQ0FJNUI7QUFKNEIsc0JBS2xDRCxlQUFla0ssUUFMbUI7QUFNbEN4Syw4QkFBVXVLLGdCQU53QjtBQU9sQzlKLDhCQUFVO0FBUHdCLGlCQUF0QyxFQVFHOEMsT0FBT2hDLFNBUlY7QUFTSCxhQVZEO0FBV0g7QUFDSixLQWhDRDtBQWlDQTs7Ozs7Ozs7OztBQVVBZ0MsV0FBT3RELE1BQVAsR0FBZ0JzRCxPQUFPdEQsTUFBUCxDQUFjOEUsSUFBZCxDQUFtQjlGLGlCQUFpQjJMLFFBQXBDLENBQWhCO0FBQ0E5Qiw0QkFBd0J2RixPQUFPdEQsTUFBL0IsRUFBdUNzRCxPQUFPaEMsU0FBOUM7QUFDQWdDLFdBQU90RCxNQUFQLEdBQWdCc0QsT0FBT3RELE1BQVAsQ0FBYzhFLElBQWQsQ0FBbUI5RixpQkFBaUIyTCxRQUFwQyxDQUFoQjtBQUNBQztBQUNBdEgsV0FBTzZELEtBQVAsR0FBZUQsV0FBVzVELE9BQU90RCxNQUFsQixDQUFmO0FBQ0E0SztBQUNBdEgsV0FBT3VELEtBQVAsR0FBZXZELE9BQU91RCxLQUFQLENBQWEvQixJQUFiLENBQWtCN0YsTUFBTTRMLFFBQXhCLENBQWY7QUFDQSxXQUFPdkgsT0FBT2hDLFNBQWQ7QUFDQTFDLGFBQVMsUUFBVDtBQUNBZ007QUFDQXZMLGdCQUFZeUwsSUFBWixDQUFpQixPQUFPM0gsU0FBUCxHQUFtQixpQkFBcEMsRUFBdURHLE1BQXZEO0FBQ0FzSDtBQUNBLFFBQUl0TCxRQUFRRyxHQUFSLENBQVlxSyxlQUFoQixFQUFpQztBQUM3Qi9HLGdCQUFRQyxHQUFSLENBQVksc0NBQXNDMkcsS0FBS0MsR0FBTCxLQUFhRixDQUFuRCxJQUF3RCxHQUFwRTtBQUNIO0FBQ0QsV0FBT3BHLE1BQVA7QUFDSDtBQTdJRHhCLFFBQUEwSCxVQUFBLEdBQUFBLFVBQUE7QUErSUEsU0FBQXVCLDBCQUFBLENBQTJDcEcsR0FBM0MsRUFBeUZxRyxJQUF6RixFQUF1RztBQUNuRyxRQUFJNUQsTUFBTTRELEtBQUtDLEtBQUwsQ0FBVyxDQUFYLENBQVY7QUFDQTdELFFBQUl0QyxJQUFKLENBQVNvRyx5QkFBeUJDLElBQXpCLENBQThCbkosU0FBOUIsRUFBeUMyQyxHQUF6QyxDQUFUO0FBQ0EsV0FBT3lDLEdBQVA7QUFDSDtBQUpEdEYsUUFBQWlKLDBCQUFBLEdBQUFBLDBCQUFBO0FBTUEsU0FBQUcsd0JBQUEsQ0FBeUN2RyxHQUF6QyxFQUF1RnlHLElBQXZGLEVBQXFHQyxJQUFyRyxFQUFpSDtBQUM3RyxRQUFJQyxXQUFXM0csSUFBSXlHLElBQUosQ0FBZjtBQUNBLFFBQUlHLFdBQVc1RyxJQUFJMEcsSUFBSixDQUFmO0FBQ0EsUUFBSUQsU0FBU0MsSUFBYixFQUFtQjtBQUNmLGVBQU8sQ0FBUDtBQUNIO0FBQ0Q7QUFDQSxRQUFJQyxZQUFZLENBQUNDLFFBQWpCLEVBQTJCO0FBQ3ZCLGVBQU8sQ0FBQyxDQUFSO0FBQ0g7QUFDRCxRQUFJLENBQUNELFFBQUQsSUFBYUMsUUFBakIsRUFBMkI7QUFDdkIsZUFBTyxDQUFDLENBQVI7QUFDSDtBQUVELFFBQUlDLFFBQVNGLFlBQVlBLFNBQVNHLFVBQXRCLElBQXFDLEVBQWpEO0FBQ0EsUUFBSUMsUUFBU0gsWUFBWUEsU0FBU0UsVUFBdEIsSUFBcUMsRUFBakQ7QUFDQTtBQUNBLFFBQUl2SixJQUFJc0osUUFBUUUsS0FBaEI7QUFDQSxRQUFJeEosQ0FBSixFQUFPO0FBQ0gsZUFBT0EsQ0FBUDtBQUNIO0FBQ0QsV0FBT2tKLEtBQUt2RCxhQUFMLENBQW1Cd0QsSUFBbkIsQ0FBUDtBQUNIO0FBdEJEdkosUUFBQW9KLHdCQUFBLEdBQUFBLHdCQUFBO0FBd0JBLElBQU0xRixRQUFRckcsS0FBS3dNLGNBQUwsRUFBZDtBQUVBLFNBQUFDLFdBQUEsQ0FBNEJDLEdBQTVCLEVBQWlEdEIsUUFBakQsRUFBaUU7QUFDN0QsV0FBT3NCLElBQUlwQyxTQUFKLENBQWNjLFFBQWQsQ0FBUDtBQUNIO0FBRkR6SSxRQUFBOEosV0FBQSxHQUFBQSxXQUFBO0FBSUEsU0FBQUUsZ0JBQUEsQ0FBaUNELEdBQWpDLEVBQXNEbkUsQ0FBdEQsRUFBcUVxRSxHQUFyRSxFQUFvRjtBQUNoRixRQUFJQSxJQUFJQyxNQUFKLE9BQWlCLFVBQXJCLEVBQWlDO0FBQzdCLGNBQU0sSUFBSS9KLEtBQUosQ0FBVSw0QkFBVixDQUFOO0FBQ0g7QUFFRCxRQUFJbUYsTUFBTXlFLElBQUkxRixJQUFKLENBQVNDLEVBQVQsQ0FBWXNCLEVBQUVoQyxZQUFGLEVBQVosS0FDTm1HLElBQUkxRixJQUFKLENBQVNDLEVBQVQsQ0FBWXNCLEVBQUVoQyxZQUFGLEVBQVosRUFBOEJxRyxJQUFJckcsWUFBSixFQUE5QixDQURKO0FBRUEsUUFBSSxDQUFDMEIsR0FBTCxFQUFVO0FBQ04sZUFBTyxFQUFQO0FBQ0g7QUFDRCxXQUFPeEMsT0FBT3FILG1CQUFQLENBQTJCN0UsR0FBM0IsRUFBZ0N0QyxJQUFoQyxHQUF1Q0gsR0FBdkMsQ0FBMkNhLE1BQU0wRyxVQUFqRCxDQUFQO0FBQ0g7QUFYRHBLLFFBQUFnSyxnQkFBQSxHQUFBQSxnQkFBQTtBQWFBLFNBQUFLLHNCQUFBLENBQXVDQyxRQUF2QyxFQUFpRTNJLE1BQWpFLEVBQStFO0FBQzNFLFFBQUkySSxTQUFTNUgsT0FBVCxDQUFpQkwsT0FBakIsQ0FBeUJWLE1BQXpCLElBQW1DLENBQXZDLEVBQTBDO0FBQ3RDLGNBQU0sSUFBSXhCLEtBQUosQ0FBVSxjQUFjd0IsTUFBZCxHQUF1QixzQkFBakMsQ0FBTjtBQUNIO0FBQ0QsUUFBSTJELE1BQU0wRSxpQkFBaUJNLFFBQWpCLEVBQTJCNUcsTUFBTUMsTUFBTixDQUFhaEMsTUFBYixDQUEzQixFQUFpRCtCLE1BQU1JLFFBQU4sQ0FBZXpHLEtBQUswRyxvQkFBcEIsQ0FBakQsQ0FBVjtBQUNBLFdBQU8xRyxLQUFLa04sY0FBTCxDQUFvQmpGLEdBQXBCLENBQVA7QUFDSDtBQU5EdEYsUUFBQXFLLHNCQUFBLEdBQUFBLHNCQUFBO0FBUUEsU0FBQUcsZUFBQSxDQUFnQ0YsUUFBaEMsRUFBMEQzSSxNQUExRCxFQUF3RTtBQUNwRSxRQUFJMkksU0FBUzVILE9BQVQsQ0FBaUJMLE9BQWpCLENBQXlCVixNQUF6QixJQUFtQyxDQUF2QyxFQUEwQztBQUN0QyxjQUFNLElBQUl4QixLQUFKLENBQVUsY0FBY3dCLE1BQWQsR0FBdUIsc0JBQWpDLENBQU47QUFDSDtBQUNELFdBQU8ySSxTQUFTcEgsU0FBVCxDQUFtQnZCLE1BQW5CLEVBQTJCNkIsT0FBM0IsQ0FBbUMyRixLQUFuQyxDQUF5QyxDQUF6QyxDQUFQO0FBQ0g7QUFMRG5KLFFBQUF3SyxlQUFBLEdBQUFBLGVBQUE7QUFPQSxTQUFBMUIsT0FBQSxHQUFBO0FBQ0ksUUFBRzJCLFVBQVVBLE9BQU9DLEVBQXBCLEVBQXdCO0FBQ3BCRCxlQUFPQyxFQUFQO0FBQ0g7QUFDSjtBQUVEOzs7Ozs7QUFNQSxTQUFBQyxtQ0FBQSxDQUFvREwsUUFBcEQsRUFBOEUzSSxNQUE5RSxFQUE0RjtBQUN4RjtBQUNBLFdBQU8wSSx1QkFBdUJDLFFBQXZCLEVBQWlDM0ksTUFBakMsQ0FBUDtBQUNIO0FBSEQzQixRQUFBMkssbUNBQUEsR0FBQUEsbUNBQUE7QUFLQSxTQUFBQyxxQkFBQSxDQUFzQ04sUUFBdEMsRUFBZ0V2TSxRQUFoRSxFQUFnRjtBQUM1RSxRQUFJdU0sU0FBU3ZNLFFBQVQsQ0FBa0JzRSxPQUFsQixDQUEwQnRFLFFBQTFCLElBQXNDLENBQTFDLEVBQTZDO0FBQ3pDLGNBQU0sSUFBSW9DLEtBQUosQ0FBVSxnQkFBZ0JwQyxRQUFoQixHQUEyQixzQkFBckMsQ0FBTjtBQUNIO0FBQ0QsUUFBSXVILE1BQU0wRSxpQkFBaUJNLFFBQWpCLEVBQTJCNUcsTUFBTVUsUUFBTixDQUFlckcsUUFBZixDQUEzQixFQUFxRDJGLE1BQU1JLFFBQU4sQ0FBZXpHLEtBQUs0RyxxQkFBcEIsQ0FBckQsQ0FBVjtBQUNBLFdBQU81RyxLQUFLa04sY0FBTCxDQUFvQmpGLEdBQXBCLENBQVA7QUFDSDtBQU5EdEYsUUFBQTRLLHFCQUFBLEdBQUFBLHFCQUFBO0FBUUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF5Q0E7Ozs7Ozs7O0FBUUEsU0FBQUMsMENBQUEsQ0FBMkRDLEtBQTNELEVBQWtGekgsVUFBbEYsRUFBd0cwSCxTQUF4RyxFQUEwSDtBQUN0SCxRQUFJekYsTUFBTSxFQUFWO0FBQ0E7QUFDQSxRQUFJMEYsS0FBS0QsWUFBWUosbUNBQVosR0FBa0ROLHNCQUEzRDtBQUNBLFFBQUkzSCxVQUFVeEMsU0FBZDtBQUNBbUQsZUFBV2pGLE9BQVgsQ0FBbUIsVUFBVUwsUUFBVixFQUFrQjtBQUNqQyxZQUFJa04sYUFBYUwsc0JBQXNCRSxLQUF0QixFQUE2Qi9NLFFBQTdCLENBQWpCO0FBQ0EsWUFBSSxDQUFDMkUsT0FBTCxFQUFjO0FBQ1ZBLHNCQUFVdUksVUFBVjtBQUNILFNBRkQsTUFFTztBQUNIdkksc0JBQVVqRixFQUFFeU4sWUFBRixDQUFleEksT0FBZixFQUF3QnVJLFVBQXhCLENBQVY7QUFDSDtBQUNKLEtBUEQ7QUFRQSxRQUFJdkksUUFBUWhDLE1BQVIsS0FBbUIsQ0FBdkIsRUFBMEI7QUFDdEIsY0FBTSxJQUFJUCxLQUFKLENBQVUsZ0JBQWdCN0MsTUFBTTZOLG9CQUFOLENBQTJCOUgsVUFBM0IsQ0FBaEIsR0FBeUQseUJBQW5FLENBQU47QUFDSDtBQUNEWCxZQUFRdEUsT0FBUixDQUFnQixVQUFVdUQsTUFBVixFQUFnQjtBQUM1QnFKLFdBQUdGLEtBQUgsRUFBVW5KLE1BQVYsRUFBa0J2RCxPQUFsQixDQUEwQixVQUFVZ04sT0FBVixFQUFpQjtBQUN2QzlGLGdCQUFJOEYsT0FBSixJQUFlLElBQWY7QUFDSCxTQUZEO0FBR0gsS0FKRDtBQUtBdEksV0FBTzZGLE1BQVAsQ0FBY3JELEdBQWQ7QUFDQSxXQUFPLEVBQUU1QyxTQUFTQSxPQUFYO0FBQ0UySSxxQkFBYy9GLEdBRGhCLEVBQVA7QUFFSDtBQXhCRHRGLFFBQUE2SywwQ0FBQSxHQUFBQSwwQ0FBQTtBQTJCQSxTQUFBUyx3Q0FBQSxDQUF5RFIsS0FBekQsRUFBZ0YvTSxRQUFoRixFQUFrR2dOLFNBQWxHLEVBQW9IO0FBQ2hILFdBQU9GLDJDQUEyQ0MsS0FBM0MsRUFBa0QsQ0FBQy9NLFFBQUQsQ0FBbEQsRUFBNkRnTixTQUE3RCxDQUFQO0FBQ0g7QUFGRC9LLFFBQUFzTCx3Q0FBQSxHQUFBQSx3Q0FBQSIsImZpbGUiOiJtb2RlbC9tb2RlbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBGdW5jdGlvbmFsaXR5IG1hbmFnaW5nIHRoZSBtYXRjaCBtb2RlbHNcclxuICpcclxuICogQGZpbGVcclxuICovXHJcblxyXG5pbXBvcnQgKiBhcyBpbnRmIGZyb20gJ2NvbnN0YW50cyc7XHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxuXHJcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdtb2RlbCcpO1xyXG5cclxuaW1wb3J0ICogYXMgbG9nZ2VyIGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5jb25zdCBsb2FkbG9nID0gbG9nZ2VyLmxvZ2dlcignbW9kZWxsb2FkJywgJycpO1xyXG5cclxuaW1wb3J0ICogIGFzIElNYXRjaCBmcm9tICcuLi9tYXRjaC9pZm1hdGNoJztcclxuaW1wb3J0ICogYXMgTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvbWF0Y2gnO1xyXG5pbXBvcnQgKiBhcyBJbnB1dEZpbHRlclJ1bGVzIGZyb20gJy4uL21hdGNoL2lucHV0RmlsdGVyUnVsZXMnO1xyXG5pbXBvcnQgKiBhcyBUb29scyBmcm9tICcuLi9tYXRjaC90b29scyc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0ICogYXMgTWV0YSBmcm9tICcuL21ldGEnO1xyXG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XHJcbmltcG9ydCAqIGFzIENpcmN1bGFyU2VyIGZyb20gJy4uL3V0aWxzL2NpcmN1bGFyc2VyJztcclxuXHJcbmltcG9ydCAqIGFzIHByb2Nlc3MgZnJvbSAncHJvY2Vzcyc7XHJcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcclxuLyoqXHJcbiAqIHRoZSBtb2RlbCBwYXRoLCBtYXkgYmUgY29udHJvbGxlZCB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVcclxuICovXHJcbnZhciBlbnZNb2RlbFBhdGggPSBwcm9jZXNzLmVudltcIkFCT1RfTU9ERUxQQVRIXCJdIHx8IFwidGVzdG1vZGVsXCI7XHJcblxyXG4vL2V4cG9ydCBpbnRlcmZhY2UgSU1vZGVscyA9IE1hdGNoLklNb2RlbHM7XHJcblxyXG4vKlxyXG5leHBvcnQgaW50ZXJmYWNlIElNb2RlbHMge1xyXG4gICAgZG9tYWluczogc3RyaW5nW10sXHJcbiAgICB0b29sczogSU1hdGNoLklUb29sW10sXHJcbiAgICBjYXRlZ29yeTogc3RyaW5nW10sXHJcbiAgICBtUnVsZXM6IElNYXRjaC5tUnVsZVtdLFxyXG4gICAgcmVjb3JkczogYW55W11cclxuICAgIHNlZW5SdWxlcz86IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLm1SdWxlIH0sXHJcbiAgICBtZXRhIDoge1xyXG4gICAgICAgIC8vIGVudGl0eSAtPiByZWxhdGlvbiAtPiB0YXJnZXRcclxuICAgICAgICB0MyA6IHsgW2tleTogc3RyaW5nXSA6IHsgW2tleSA6IHN0cmluZ10gOiBhbnkgfX1cclxuICAgIH1cclxufSovXHJcblxyXG50eXBlIElNb2RlbCA9IElNYXRjaC5JTW9kZWw7XHJcblxyXG5jb25zdCBBUlJfTU9ERUxfUFJPUEVSVElFUyA9IFtcImRvbWFpblwiLCBcImJpdGluZGV4XCIsIFwiZGVmYXVsdGtleWNvbHVtblwiLCBcImRlZmF1bHR1cmlcIiwgXCJjYXRlZ29yeURlc2NyaWJlZFwiLCBcImNvbHVtbnNcIiwgXCJkZXNjcmlwdGlvblwiLCBcInRvb2xcIiwgXCJ0b29saGlkZGVuXCIsIFwic3lub255bXNcIiwgXCJjYXRlZ29yeVwiLCBcIndvcmRpbmRleFwiLCBcImV4YWN0bWF0Y2hcIiwgXCJoaWRkZW5cIl07XHJcblxyXG5mdW5jdGlvbiBhZGRTeW5vbnltcyhzeW5vbnltczogc3RyaW5nW10sIGNhdGVnb3J5OiBzdHJpbmcsIHN5bm9ueW1Gb3I6IHN0cmluZywgYml0aW5kZXg6IG51bWJlciwgbVJ1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+LCBzZWVuOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5tUnVsZVtdIH0pIHtcclxuICAgIHN5bm9ueW1zLmZvckVhY2goZnVuY3Rpb24gKHN5bikge1xyXG4gICAgICAgIHZhciBvUnVsZSA9IHtcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBzeW5vbnltRm9yLFxyXG4gICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgIHdvcmQ6IHN5bixcclxuICAgICAgICAgICAgYml0aW5kZXg6IGJpdGluZGV4LFxyXG4gICAgICAgICAgICBfcmFua2luZzogMC45NVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImluc2VydGluZyBzeW5vbnltXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSkpIDogJy0nKTtcclxuICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG1SdWxlcywgb1J1bGUsIHNlZW4pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFJ1bGVLZXkocnVsZSkge1xyXG4gICAgdmFyIHIxID0gcnVsZS5tYXRjaGVkU3RyaW5nICsgXCItfC1cIiArIHJ1bGUuY2F0ZWdvcnkgKyBcIiAtfC0gXCIgKyBydWxlLnR5cGUgKyBcIiAtfC0gXCIgKyBydWxlLndvcmQgKyBcIiBcIjtcclxuICAgIGlmIChydWxlLnJhbmdlKSB7XHJcbiAgICAgICAgdmFyIHIyID0gZ2V0UnVsZUtleShydWxlLnJhbmdlLnJ1bGUpO1xyXG4gICAgICAgIHIxICs9IFwiIC18LSBcIiArIHJ1bGUucmFuZ2UubG93ICsgXCIvXCIgKyBydWxlLnJhbmdlLmhpZ2ggKyBcIiAtfC0gXCIgKyByMjtcclxuICAgIH1cclxuICAgIHJldHVybiByMTtcclxufVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIEJyZWFrZG93biBmcm9tICcuLi9tYXRjaC9icmVha2Rvd24nO1xyXG5cclxuLyogZ2l2ZW4gYSBydWxlIHdoaWNoIHJlcHJlc2VudHMgYSB3b3JkIHNlcXVlbmNlIHdoaWNoIGlzIHNwbGl0IGR1cmluZyB0b2tlbml6YXRpb24gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFkZEJlc3RTcGxpdChtUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4sIHJ1bGU6IElNYXRjaC5tUnVsZSwgc2VlblJ1bGVzOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5tUnVsZVtdIH0pIHtcclxuICAgIC8vaWYoIWdsb2JhbF9BZGRTcGxpdHMpIHtcclxuICAgIC8vICAgIHJldHVybjtcclxuICAgIC8vfVxyXG5cclxuICAgIGlmIChydWxlLnR5cGUgIT09IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBiZXN0ID0gQnJlYWtkb3duLm1ha2VNYXRjaFBhdHRlcm4ocnVsZS5sb3dlcmNhc2V3b3JkKTtcclxuICAgIGlmICghYmVzdCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBuZXdSdWxlID0ge1xyXG4gICAgICAgIGNhdGVnb3J5OiBydWxlLmNhdGVnb3J5LFxyXG4gICAgICAgIG1hdGNoZWRTdHJpbmc6IHJ1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICBiaXRpbmRleDogcnVsZS5iaXRpbmRleCxcclxuICAgICAgICB3b3JkOiBiZXN0Lmxvbmdlc3RUb2tlbixcclxuICAgICAgICB0eXBlOiAwLFxyXG4gICAgICAgIGxvd2VyY2FzZXdvcmQ6IGJlc3QubG9uZ2VzdFRva2VuLFxyXG4gICAgICAgIF9yYW5raW5nOiAwLjk1LFxyXG4gICAgICAgIC8vICAgIGV4YWN0T25seSA6IHJ1bGUuZXhhY3RPbmx5LFxyXG4gICAgICAgIHJhbmdlOiBiZXN0LnNwYW5cclxuICAgIH0gYXMgSU1hdGNoLm1SdWxlO1xyXG4gICAgaWYgKHJ1bGUuZXhhY3RPbmx5KSB7XHJcbiAgICAgICAgbmV3UnVsZS5leGFjdE9ubHkgPSBydWxlLmV4YWN0T25seVxyXG4gICAgfTtcclxuICAgIG5ld1J1bGUucmFuZ2UucnVsZSA9IHJ1bGU7XHJcbiAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG1SdWxlcywgbmV3UnVsZSwgc2VlblJ1bGVzKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGluc2VydFJ1bGVJZk5vdFByZXNlbnQobVJ1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+LCBydWxlOiBJTWF0Y2gubVJ1bGUsXHJcbiAgICBzZWVuUnVsZXM6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLm1SdWxlW10gfSkge1xyXG5cclxuICAgIGlmIChydWxlLnR5cGUgIT09IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCkge1xyXG4gICAgICAgIG1SdWxlcy5wdXNoKHJ1bGUpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmICgocnVsZS53b3JkID09PSB1bmRlZmluZWQpIHx8IChydWxlLm1hdGNoZWRTdHJpbmcgPT09IHVuZGVmaW5lZCkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2lsbGVnYWwgcnVsZScgKyBKU09OLnN0cmluZ2lmeShydWxlLCB1bmRlZmluZWQsIDIpKTtcclxuICAgIH1cclxuICAgIHZhciByID0gZ2V0UnVsZUtleShydWxlKTtcclxuICAgIC8qIGlmKCAocnVsZS53b3JkID09PSBcInNlcnZpY2VcIiB8fCBydWxlLndvcmQ9PT0gXCJzZXJ2aWNlc1wiKSAmJiByLmluZGV4T2YoJ09EYXRhJykgPj0gMCkge1xyXG4gICAgICAgICBjb25zb2xlLmxvZyhcInJ1bGVrZXkgaXNcIiArIHIpO1xyXG4gICAgICAgICBjb25zb2xlLmxvZyhcInByZXNlbmNlIGlzIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VlblJ1bGVzW3JdKSk7XHJcbiAgICAgfSovXHJcbiAgICBydWxlLmxvd2VyY2FzZXdvcmQgPSBydWxlLndvcmQudG9Mb3dlckNhc2UoKTtcclxuICAgIGlmIChzZWVuUnVsZXNbcl0pIHtcclxuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiQXR0ZW1wdGluZyB0byBpbnNlcnQgZHVwbGljYXRlXCIgKyBKU09OLnN0cmluZ2lmeShydWxlLCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcclxuICAgICAgICB2YXIgZHVwbGljYXRlcyA9IHNlZW5SdWxlc1tyXS5maWx0ZXIoZnVuY3Rpb24gKG9FbnRyeSkge1xyXG4gICAgICAgICAgICByZXR1cm4gMCA9PT0gSW5wdXRGaWx0ZXJSdWxlcy5jb21wYXJlTVJ1bGVGdWxsKG9FbnRyeSwgcnVsZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgaWYgKGR1cGxpY2F0ZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgc2VlblJ1bGVzW3JdID0gKHNlZW5SdWxlc1tyXSB8fCBbXSk7XHJcbiAgICBzZWVuUnVsZXNbcl0ucHVzaChydWxlKTtcclxuICAgIGlmIChydWxlLndvcmQgPT09IFwiXCIpIHtcclxuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCdTa2lwcGluZyBydWxlIHdpdGggZW10cHkgd29yZCAnICsgSlNPTi5zdHJpbmdpZnkocnVsZSwgdW5kZWZpbmVkLCAyKSkgOiAnLScpO1xyXG4gICAgICAgIGxvYWRsb2coJ1NraXBwaW5nIHJ1bGUgd2l0aCBlbXRweSB3b3JkICcgKyBKU09OLnN0cmluZ2lmeShydWxlLCB1bmRlZmluZWQsIDIpKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBtUnVsZXMucHVzaChydWxlKTtcclxuICAgIGFkZEJlc3RTcGxpdChtUnVsZXMsIHJ1bGUsIHNlZW5SdWxlcyk7XHJcbiAgICByZXR1cm47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlYWRGaWxlQXNKU09OKGZpbGVuYW1lIDogc3RyaW5nKSA6IGFueSB7XHJcbiAgICB2YXIgZGF0YSA9IGZzLnJlYWRGaWxlU3luYyhmaWxlbmFtZSwgJ3V0Zi04Jyk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEpO1xyXG4gICAgfSBjYXRjaChlKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJDb250ZW50IG9mIGZpbGUgXCIrIGZpbGVuYW1lICsgXCIgaXMgbm8ganNvblwiICsgZSk7XHJcbiAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgIH1cclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRNb2RlbERhdGEobW9kZWxQYXRoOiBzdHJpbmcsIG9NZGw6IElNb2RlbCwgc01vZGVsTmFtZTogc3RyaW5nLCBvTW9kZWw6IElNYXRjaC5JTW9kZWxzKSB7XHJcbiAgICAvLyByZWFkIHRoZSBkYXRhIC0+XHJcbiAgICAvLyBkYXRhIGlzIHByb2Nlc3NlZCBpbnRvIG1SdWxlcyBkaXJlY3RseSxcclxuICAgIHZhciBiaXRpbmRleCA9IG9NZGwuYml0aW5kZXg7XHJcbiAgICBjb25zdCBzRmlsZU5hbWUgPSAoJy4vJyArIG1vZGVsUGF0aCArICcvJyArIHNNb2RlbE5hbWUgKyBcIi5kYXRhLmpzb25cIik7XHJcbiAgICB2YXIgb01kbERhdGE9IHJlYWRGaWxlQXNKU09OKHNGaWxlTmFtZSk7XHJcbiAgICBvTWRsRGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChvRW50cnkpIHtcclxuICAgICAgICBpZiAoIW9FbnRyeS5kb21haW4pIHtcclxuICAgICAgICAgICAgb0VudHJ5Ll9kb21haW4gPSBvTWRsLmRvbWFpbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFvRW50cnkudG9vbCAmJiBvTWRsLnRvb2wubmFtZSkge1xyXG4gICAgICAgICAgICBvRW50cnkudG9vbCA9IG9NZGwudG9vbC5uYW1lO1xyXG4gICAgICAgIH1cclxuICAgICAgICBvTW9kZWwucmVjb3Jkcy5wdXNoKG9FbnRyeSk7XHJcbiAgICAgICAgb01kbC5jYXRlZ29yeS5mb3JFYWNoKGZ1bmN0aW9uIChjYXQpIHtcclxuICAgICAgICAgICAgaWYgKG9FbnRyeVtjYXRdID09PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgICAgICAgICAgb0VudHJ5W2NhdF0gPSBcIm4vYVwiO1xyXG4gICAgICAgICAgICAgICAgdmFyIGJ1ZyA9XHJcbiAgICAgICAgICAgICAgICAgICAgXCJJTkNPTlNJU1RFTlQqPiBNb2RlbERhdGEgXCIgKyBzRmlsZU5hbWUgKyBcIiBkb2VzIG5vdCBjb250YWluIGNhdGVnb3J5IFwiICsgY2F0ICsgXCIgd2l0aCB2YWx1ZSAndW5kZWZpbmVkJywgdW5kZWZpbmVkIGlzIGlsbGVnYWwgdmFsdWUsIHVzZSBuL2EgXCIgKyBKU09OLnN0cmluZ2lmeShvRW50cnkpICsgXCJcIjtcclxuICAgICAgICAgICAgICAgIGRlYnVnbG9nKGJ1Zyk7XHJcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGJ1Zyk7XHJcbiAgICAgICAgICAgICAgICAvL3Byb2Nlc3MuZXhpdCgtMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBvTWRsLndvcmRpbmRleC5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xyXG4gICAgICAgICAgICBpZiAob0VudHJ5W2NhdGVnb3J5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIklOQ09OU0lTVEVOVCo+IE1vZGVsRGF0YSBcIiArIHNGaWxlTmFtZSArIFwiIGRvZXMgbm90IGNvbnRhaW4gY2F0ZWdvcnkgXCIgKyBjYXRlZ29yeSArIFwiIG9mIHdvcmRpbmRleFwiICsgSlNPTi5zdHJpbmdpZnkob0VudHJ5KSArIFwiXCIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG9FbnRyeVtjYXRlZ29yeV0gIT09IFwiKlwiKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc1N0cmluZyA9IG9FbnRyeVtjYXRlZ29yeV07XHJcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcInB1c2hpbmcgcnVsZSB3aXRoIFwiICsgY2F0ZWdvcnkgKyBcIiAtPiBcIiArIHNTdHJpbmcpO1xyXG4gICAgICAgICAgICAgICAgdmFyIG9SdWxlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBzU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCxcclxuICAgICAgICAgICAgICAgICAgICB3b3JkOiBzU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgIGJpdGluZGV4OiBiaXRpbmRleCxcclxuICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogMC45NVxyXG4gICAgICAgICAgICAgICAgfSBhcyBJTWF0Y2gubVJ1bGU7XHJcbiAgICAgICAgICAgICAgICBpZiAob01kbC5leGFjdG1hdGNoICYmIG9NZGwuZXhhY3RtYXRjaC5pbmRleE9mKGNhdGVnb3J5KSA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb1J1bGUuZXhhY3RPbmx5ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywgb1J1bGUsIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG9NZGxEYXRhLnN5bm9ueW1zICYmIG9NZGxEYXRhLnN5bm9ueW1zW2NhdGVnb3J5XSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFkZFN5bm9ueW1zKG9NZGxEYXRhLnN5bm9ueW1zW2NhdGVnb3J5XSwgY2F0ZWdvcnksIHNTdHJpbmcsIGJpdGluZGV4LCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChvRW50cnkuc3lub255bXMgJiYgb0VudHJ5LnN5bm9ueW1zW2NhdGVnb3J5XSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFkZFN5bm9ueW1zKG9FbnRyeS5zeW5vbnltc1tjYXRlZ29yeV0sIGNhdGVnb3J5LCBzU3RyaW5nLCBiaXRpbmRleCwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBsb2FkTW9kZWwobW9kZWxQYXRoOiBzdHJpbmcsIHNNb2RlbE5hbWU6IHN0cmluZywgb01vZGVsOiBJTWF0Y2guSU1vZGVscykge1xyXG4gICAgZGVidWdsb2coXCIgbG9hZGluZyBcIiArIHNNb2RlbE5hbWUgKyBcIiAuLi4uXCIpO1xyXG4gICAgdmFyIG9NZGwgPSByZWFkRmlsZUFzSlNPTignLi8nICsgbW9kZWxQYXRoICsgJy8nICsgc01vZGVsTmFtZSArIFwiLm1vZGVsLmpzb25cIikgYXMgSU1vZGVsO1xyXG4gICAgbWVyZ2VNb2RlbEpzb24oc01vZGVsTmFtZSwgb01kbCwgb01vZGVsKTtcclxuICAgIGxvYWRNb2RlbERhdGEobW9kZWxQYXRoLCBvTWRsLCBzTW9kZWxOYW1lLCBvTW9kZWwpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RG9tYWluQml0SW5kZXgoZG9tYWluOiBzdHJpbmcsIG9Nb2RlbDogSU1hdGNoLklNb2RlbHMpOiBudW1iZXIge1xyXG4gICAgdmFyIGluZGV4ID0gb01vZGVsLmRvbWFpbnMuaW5kZXhPZihkb21haW4pO1xyXG4gICAgaWYgKGluZGV4IDwgMCkge1xyXG4gICAgICAgIGluZGV4ID0gb01vZGVsLmRvbWFpbnMubGVuZ3RoO1xyXG4gICAgfVxyXG4gICAgaWYgKGluZGV4ID49IDMyKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidG9vIG1hbnkgZG9tYWluIGZvciBzaW5nbGUgMzIgYml0IGluZGV4XCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDB4MDAwMSA8PCBpbmRleDtcclxufVxyXG5cclxuZnVuY3Rpb24gbWVyZ2VNb2RlbEpzb24oc01vZGVsTmFtZTogc3RyaW5nLCBvTWRsOiBJTW9kZWwsIG9Nb2RlbDogSU1hdGNoLklNb2RlbHMpIHtcclxuICAgIHZhciBjYXRlZ29yeURlc2NyaWJlZE1hcCA9IHt9IGFzIHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklDYXRlZ29yeURlc2MgfTtcclxuICAgIG9NZGwuYml0aW5kZXggPSBnZXREb21haW5CaXRJbmRleChvTWRsLmRvbWFpbiwgb01vZGVsKTtcclxuICAgIG9NZGwuY2F0ZWdvcnlEZXNjcmliZWQgPSBbXTtcclxuICAgIC8vIHJlY3RpZnkgY2F0ZWdvcnlcclxuICAgIG9NZGwuY2F0ZWdvcnkgPSBvTWRsLmNhdGVnb3J5Lm1hcChmdW5jdGlvbiAoY2F0OiBhbnkpIHtcclxuICAgICAgICBpZiAodHlwZW9mIGNhdCA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICByZXR1cm4gY2F0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodHlwZW9mIGNhdC5uYW1lICE9PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTWlzc2luZyBuYW1lIGluIG9iamVjdCB0eXBlZCBjYXRlZ29yeSBpbiBcIiArIEpTT04uc3RyaW5naWZ5KGNhdCkgKyBcIiBpbiBtb2RlbCBcIiArIHNNb2RlbE5hbWUpO1xyXG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgICAgICAvL3Rocm93IG5ldyBFcnJvcignRG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgYWxyZWFkeSBsb2FkZWQgd2hpbGUgbG9hZGluZyAnICsgc01vZGVsTmFtZSArICc/Jyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGVnb3J5RGVzY3JpYmVkTWFwW2NhdC5uYW1lXSA9IGNhdDtcclxuICAgICAgICBvTWRsLmNhdGVnb3J5RGVzY3JpYmVkLnB1c2goY2F0KTtcclxuICAgICAgICByZXR1cm4gY2F0Lm5hbWU7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBhZGQgdGhlIGNhdGVnb3JpZXMgdG8gdGhlIG1vZGVsOlxyXG4gICAgb01kbC5jYXRlZ29yeS5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xyXG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywge1xyXG4gICAgICAgICAgICBjYXRlZ29yeTogXCJjYXRlZ29yeVwiLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICB3b3JkOiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgbG93ZXJjYXNld29yZDogY2F0ZWdvcnkudG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXgsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAob01vZGVsLmRvbWFpbnMuaW5kZXhPZihvTWRsLmRvbWFpbikgPj0gMCkge1xyXG4gICAgICAgIGRlYnVnbG9nKFwiKioqKioqKioqKipoZXJlIG1kbFwiICsgSlNPTi5zdHJpbmdpZnkob01kbCwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdEb21haW4gJyArIG9NZGwuZG9tYWluICsgJyBhbHJlYWR5IGxvYWRlZCB3aGlsZSBsb2FkaW5nICcgKyBzTW9kZWxOYW1lICsgJz8nKTtcclxuICAgIH1cclxuICAgIC8vIGNoZWNrIHByb3BlcnRpZXMgb2YgbW9kZWxcclxuICAgIE9iamVjdC5rZXlzKG9NZGwpLnNvcnQoKS5mb3JFYWNoKGZ1bmN0aW9uIChzUHJvcGVydHkpIHtcclxuICAgICAgICBpZiAoQVJSX01PREVMX1BST1BFUlRJRVMuaW5kZXhPZihzUHJvcGVydHkpIDwgMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZGVsIHByb3BlcnR5IFwiJyArIHNQcm9wZXJ0eSArICdcIiBub3QgYSBrbm93biBtb2RlbCBwcm9wZXJ0eSBpbiBtb2RlbCBvZiBkb21haW4gJyArIG9NZGwuZG9tYWluICsgJyAnKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIC8vIGNvbnNpZGVyIHN0cmVhbWxpbmluZyB0aGUgY2F0ZWdvcmllc1xyXG4gICAgb01vZGVsLnJhd01vZGVsc1tvTWRsLmRvbWFpbl0gPSBvTWRsO1xyXG5cclxuICAgIG9Nb2RlbC5mdWxsLmRvbWFpbltvTWRsLmRvbWFpbl0gPSB7XHJcbiAgICAgICAgZGVzY3JpcHRpb246IG9NZGwuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcnlEZXNjcmliZWRNYXAsXHJcbiAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXhcclxuICAgIH07XHJcblxyXG4gICAgLy8gY2hlY2sgdGhhdFxyXG5cclxuXHJcbiAgICAvLyBjaGVjayB0aGF0IG1lbWJlcnMgb2Ygd29yZGluZGV4IGFyZSBpbiBjYXRlZ29yaWVzLFxyXG4gICAgb01kbC53b3JkaW5kZXggPSBvTWRsLndvcmRpbmRleCB8fCBbXTtcclxuICAgIG9NZGwud29yZGluZGV4LmZvckVhY2goZnVuY3Rpb24gKHNXb3JkSW5kZXgpIHtcclxuICAgICAgICBpZiAob01kbC5jYXRlZ29yeS5pbmRleE9mKHNXb3JkSW5kZXgpIDwgMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZGVsIHdvcmRpbmRleCBcIicgKyBzV29yZEluZGV4ICsgJ1wiIG5vdCBhIGNhdGVnb3J5IG9mIGRvbWFpbiAnICsgb01kbC5kb21haW4gKyAnICcpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgb01kbC5leGFjdG1hdGNoID0gb01kbC5leGFjdG1hdGNoIHx8IFtdO1xyXG4gICAgb01kbC5leGFjdG1hdGNoLmZvckVhY2goZnVuY3Rpb24gKHNFeGFjdE1hdGNoKSB7XHJcbiAgICAgICAgaWYgKG9NZGwuY2F0ZWdvcnkuaW5kZXhPZihzRXhhY3RNYXRjaCkgPCAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTW9kZWwgZXhhY3RtYXRjaCBcIicgKyBzRXhhY3RNYXRjaCArICdcIiBub3QgYSBjYXRlZ29yeSBvZiBkb21haW4gJyArIG9NZGwuZG9tYWluICsgJyAnKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIG9NZGwuY29sdW1ucyA9IG9NZGwuY29sdW1ucyB8fCBbXTtcclxuICAgIG9NZGwuY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChzRXhhY3RNYXRjaCkge1xyXG4gICAgICAgIGlmIChvTWRsLmNhdGVnb3J5LmluZGV4T2Yoc0V4YWN0TWF0Y2gpIDwgMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZGVsIGNvbHVtbiBcIicgKyBzRXhhY3RNYXRjaCArICdcIiBub3QgYSBjYXRlZ29yeSBvZiBkb21haW4gJyArIG9NZGwuZG9tYWluICsgJyAnKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcblxyXG4gICAgLy8gYWRkIHJlbGF0aW9uIGRvbWFpbiAtPiBjYXRlZ29yeVxyXG4gICAgdmFyIGRvbWFpblN0ciA9IE1ldGFGLkRvbWFpbihvTWRsLmRvbWFpbikudG9GdWxsU3RyaW5nKCk7XHJcbiAgICB2YXIgcmVsYXRpb25TdHIgPSBNZXRhRi5SZWxhdGlvbihNZXRhLlJFTEFUSU9OX2hhc0NhdGVnb3J5KS50b0Z1bGxTdHJpbmcoKTtcclxuICAgIHZhciByZXZlcnNlUmVsYXRpb25TdHIgPSBNZXRhRi5SZWxhdGlvbihNZXRhLlJFTEFUSU9OX2lzQ2F0ZWdvcnlPZikudG9GdWxsU3RyaW5nKCk7XHJcbiAgICBvTWRsLmNhdGVnb3J5LmZvckVhY2goZnVuY3Rpb24gKHNDYXRlZ29yeSkge1xyXG5cclxuICAgICAgICB2YXIgQ2F0ZWdvcnlTdHJpbmcgPSBNZXRhRi5DYXRlZ29yeShzQ2F0ZWdvcnkpLnRvRnVsbFN0cmluZygpO1xyXG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl0gPSBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdIHx8IHt9O1xyXG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl1bcmVsYXRpb25TdHJdID0gb01vZGVsLm1ldGEudDNbZG9tYWluU3RyXVtyZWxhdGlvblN0cl0gfHwge307XHJcbiAgICAgICAgb01vZGVsLm1ldGEudDNbZG9tYWluU3RyXVtyZWxhdGlvblN0cl1bQ2F0ZWdvcnlTdHJpbmddID0ge307XHJcblxyXG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW0NhdGVnb3J5U3RyaW5nXSA9IG9Nb2RlbC5tZXRhLnQzW0NhdGVnb3J5U3RyaW5nXSB8fCB7fTtcclxuICAgICAgICBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ11bcmV2ZXJzZVJlbGF0aW9uU3RyXSA9IG9Nb2RlbC5tZXRhLnQzW0NhdGVnb3J5U3RyaW5nXVtyZXZlcnNlUmVsYXRpb25TdHJdIHx8IHt9O1xyXG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW0NhdGVnb3J5U3RyaW5nXVtyZXZlcnNlUmVsYXRpb25TdHJdW2RvbWFpblN0cl0gPSB7fTtcclxuXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBhZGQgYSBwcmVjaWNlIGRvbWFpbiBtYXRjaHJ1bGVcclxuICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywge1xyXG4gICAgICAgIGNhdGVnb3J5OiBcImRvbWFpblwiLFxyXG4gICAgICAgIG1hdGNoZWRTdHJpbmc6IG9NZGwuZG9tYWluLFxyXG4gICAgICAgIHR5cGU6IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCxcclxuICAgICAgICB3b3JkOiBvTWRsLmRvbWFpbixcclxuICAgICAgICBiaXRpbmRleDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICBfcmFua2luZzogMC45NVxyXG4gICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcblxyXG4gICAgLy8gY2hlY2sgdGhlIHRvb2xcclxuICAgIGlmIChvTWRsLnRvb2wgJiYgb01kbC50b29sLnJlcXVpcmVzKSB7XHJcbiAgICAgICAgdmFyIHJlcXVpcmVzID0gT2JqZWN0LmtleXMob01kbC50b29sLnJlcXVpcmVzIHx8IHt9KTtcclxuICAgICAgICB2YXIgZGlmZiA9IF8uZGlmZmVyZW5jZShyZXF1aXJlcywgb01kbC5jYXRlZ29yeSk7XHJcbiAgICAgICAgaWYgKGRpZmYubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgICR7b01kbC5kb21haW59IDogVW5rb3duIGNhdGVnb3J5IGluIHJlcXVpcmVzIG9mIHRvb2w6IFwiYCArIGRpZmYuam9pbignXCInKSArICdcIicpO1xyXG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgb3B0aW9uYWwgPSBPYmplY3Qua2V5cyhvTWRsLnRvb2wub3B0aW9uYWwpO1xyXG4gICAgICAgIGRpZmYgPSBfLmRpZmZlcmVuY2Uob3B0aW9uYWwsIG9NZGwuY2F0ZWdvcnkpO1xyXG4gICAgICAgIGlmIChkaWZmLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYCAke29NZGwuZG9tYWlufSA6IFVua293biBjYXRlZ29yeSBvcHRpb25hbCBvZiB0b29sOiBcImAgKyBkaWZmLmpvaW4oJ1wiJykgKyAnXCInKTtcclxuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgT2JqZWN0LmtleXMob01kbC50b29sLnNldHMgfHwge30pLmZvckVhY2goZnVuY3Rpb24gKHNldElEKSB7XHJcbiAgICAgICAgICAgIHZhciBkaWZmID0gXy5kaWZmZXJlbmNlKG9NZGwudG9vbC5zZXRzW3NldElEXS5zZXQsIG9NZGwuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgICBpZiAoZGlmZi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICR7b01kbC5kb21haW59IDogVW5rb3duIGNhdGVnb3J5IGluIHNldElkICR7c2V0SUR9IG9mIHRvb2w6IFwiYCArIGRpZmYuam9pbignXCInKSArICdcIicpO1xyXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBleHRyYWN0IHRvb2xzIGFuIGFkZCB0byB0b29sczpcclxuICAgICAgICBvTW9kZWwudG9vbHMuZmlsdGVyKGZ1bmN0aW9uIChvRW50cnkpIHtcclxuICAgICAgICAgICAgaWYgKG9FbnRyeS5uYW1lID09PSAob01kbC50b29sICYmIG9NZGwudG9vbC5uYW1lKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJUb29sIFwiICsgb01kbC50b29sLm5hbWUgKyBcIiBhbHJlYWR5IHByZXNlbnQgd2hlbiBsb2FkaW5nIFwiICsgc01vZGVsTmFtZSk7XHJcbiAgICAgICAgICAgICAgICAvL3Rocm93IG5ldyBFcnJvcignRG9tYWluIGFscmVhZHkgbG9hZGVkPycpO1xyXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBvTWRsLnRvb2xoaWRkZW4gPSB0cnVlO1xyXG4gICAgICAgIG9NZGwudG9vbC5yZXF1aXJlcyA9IHsgXCJpbXBvc3NpYmxlXCI6IHt9IH07XHJcbiAgICB9XHJcbiAgICAvLyBhZGQgdGhlIHRvb2wgbmFtZSBhcyBydWxlIHVubGVzcyBoaWRkZW5cclxuICAgIGlmICghb01kbC50b29saGlkZGVuICYmIG9NZGwudG9vbCAmJiBvTWRsLnRvb2wubmFtZSkge1xyXG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywge1xyXG4gICAgICAgICAgICBjYXRlZ29yeTogXCJ0b29sXCIsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9NZGwudG9vbC5uYW1lLFxyXG4gICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgIHdvcmQ6IG9NZGwudG9vbC5uYW1lLFxyXG4gICAgICAgICAgICBiaXRpbmRleDogb01kbC5iaXRpbmRleCxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOTVcclxuICAgICAgICB9LCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuICAgIH07XHJcbiAgICBpZiAob01kbC5zeW5vbnltcyAmJiBvTWRsLnN5bm9ueW1zW1widG9vbFwiXSkge1xyXG4gICAgICAgIGFkZFN5bm9ueW1zKG9NZGwuc3lub255bXNbXCJ0b29sXCJdLCBcInRvb2xcIiwgb01kbC50b29sLm5hbWUsIG9NZGwuYml0aW5kZXgsIG9Nb2RlbC5tUnVsZXMsIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgfTtcclxuICAgIGlmIChvTWRsLnN5bm9ueW1zKSB7XHJcbiAgICAgICAgT2JqZWN0LmtleXMob01kbC5zeW5vbnltcykuZm9yRWFjaChmdW5jdGlvbiAoc3N5bmtleSkge1xyXG4gICAgICAgICAgICBpZiAob01kbC5jYXRlZ29yeS5pbmRleE9mKHNzeW5rZXkpID49IDAgJiYgc3N5bmtleSAhPT0gXCJ0b29sXCIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChvTW9kZWwuZnVsbC5kb21haW5bb01kbC5kb21haW5dLmNhdGVnb3JpZXNbc3N5bmtleV0pIHtcclxuICAgICAgICAgICAgICAgICAgICBvTW9kZWwuZnVsbC5kb21haW5bb01kbC5kb21haW5dLmNhdGVnb3JpZXNbc3N5bmtleV0uc3lub255bXMgPSBvTWRsLnN5bm9ueW1zW3NzeW5rZXldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGFkZFN5bm9ueW1zKG9NZGwuc3lub255bXNbc3N5bmtleV0sIFwiY2F0ZWdvcnlcIiwgc3N5bmtleSwgb01kbC5iaXRpbmRleCwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIG9Nb2RlbC5kb21haW5zLnB1c2gob01kbC5kb21haW4pO1xyXG4gICAgaWYgKG9NZGwudG9vbC5uYW1lKSB7XHJcbiAgICAgICAgb01vZGVsLnRvb2xzLnB1c2gob01kbC50b29sKTtcclxuICAgIH1cclxuICAgIG9Nb2RlbC5jYXRlZ29yeSA9IG9Nb2RlbC5jYXRlZ29yeS5jb25jYXQob01kbC5jYXRlZ29yeSk7XHJcbiAgICBvTW9kZWwuY2F0ZWdvcnkuc29ydCgpO1xyXG4gICAgb01vZGVsLmNhdGVnb3J5ID0gb01vZGVsLmNhdGVnb3J5LmZpbHRlcihmdW5jdGlvbiAoc3RyaW5nLCBpbmRleCkge1xyXG4gICAgICAgIHJldHVybiBvTW9kZWwuY2F0ZWdvcnlbaW5kZXhdICE9PSBvTW9kZWwuY2F0ZWdvcnlbaW5kZXggKyAxXTtcclxuICAgIH0pO1xyXG5cclxufSAvLyBsb2FkbW9kZWxcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzcGxpdFJ1bGVzKHJ1bGVzOiBJTWF0Y2gubVJ1bGVbXSk6IElNYXRjaC5TcGxpdFJ1bGVzIHtcclxuICAgIHZhciByZXMgPSB7fTtcclxuICAgIHZhciBub25Xb3JkUnVsZXMgPSBbXTtcclxuICAgIHJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKHJ1bGUpIHtcclxuICAgICAgICBpZiAocnVsZS50eXBlID09PSBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQpIHtcclxuICAgICAgICAgICAgaWYgKCFydWxlLmxvd2VyY2FzZXdvcmQpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlJ1bGUgaGFzIG5vIG1lbWJlciBsb3dlcmNhc2V3b3JkXCIgKyBKU09OLnN0cmluZ2lmeShydWxlKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVzW3J1bGUubG93ZXJjYXNld29yZF0gPSByZXNbcnVsZS5sb3dlcmNhc2V3b3JkXSB8fCB7IGJpdGluZGV4OiAwLCBydWxlczogW10gfTtcclxuICAgICAgICAgICAgcmVzW3J1bGUubG93ZXJjYXNld29yZF0uYml0aW5kZXggPSByZXNbcnVsZS5sb3dlcmNhc2V3b3JkXS5iaXRpbmRleCB8IHJ1bGUuYml0aW5kZXg7XHJcbiAgICAgICAgICAgIHJlc1tydWxlLmxvd2VyY2FzZXdvcmRdLnJ1bGVzLnB1c2gocnVsZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbm9uV29yZFJ1bGVzLnB1c2gocnVsZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHdvcmRNYXA6IHJlcyxcclxuICAgICAgICBub25Xb3JkUnVsZXM6IG5vbldvcmRSdWxlcyxcclxuICAgICAgICBhbGxSdWxlczogcnVsZXMsXHJcbiAgICAgICAgd29yZENhY2hlIDoge31cclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNtcExlbmd0aFNvcnQoYTogc3RyaW5nLCBiOiBzdHJpbmcpIHtcclxuICAgIHZhciBkID0gYS5sZW5ndGggLSBiLmxlbmd0aDtcclxuICAgIGlmIChkKSB7XHJcbiAgICAgICAgcmV0dXJuIGQ7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYS5sb2NhbGVDb21wYXJlKGIpO1xyXG59XHJcblxyXG5pbXBvcnQgKiBhcyBEaXN0YW5jZSBmcm9tICcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4nO1xyXG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuLi9tYXRjaC9hbGdvbCc7XHJcbi8vIG9mZnNldFswXSA6IGxlbi0yXHJcbi8vICAgICAgICAgICAgIGxlbiAtMVxyXG4vLyAgICAgICAgICAgICBsZW5cclxuLy8gICAgICAgICAgICAgbGVuICsxXHJcbi8vICAgICAgICAgICAgIGxlbiArMlxyXG4vLyAgICAgICAgICAgICBsZW4gKzNcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmaW5kTmV4dExlbih0YXJnZXRMZW46IG51bWJlciwgYXJyOiBzdHJpbmdbXSwgb2Zmc2V0czogbnVtYmVyW10pIHtcclxuICAgIG9mZnNldHMuc2hpZnQoKTtcclxuICAgIGZvciAodmFyIGkgPSBvZmZzZXRzWzRdOyAoaSA8IGFyci5sZW5ndGgpICYmIChhcnJbaV0ubGVuZ3RoIDw9IHRhcmdldExlbik7ICsraSkge1xyXG4gICAgICAgIC8qIGVtcHR5Ki9cclxuICAgIH1cclxuICAgIC8vY29uc29sZS5sb2coXCJwdXNoaW5nIFwiICsgaSk7XHJcbiAgICBvZmZzZXRzLnB1c2goaSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGRSYW5nZVJ1bGVzVW5sZXNzUHJlc2VudChydWxlczogSU1hdGNoLm1SdWxlW10sIGxjd29yZDogc3RyaW5nLCByYW5nZVJ1bGVzOiBJTWF0Y2gubVJ1bGVbXSwgcHJlc2VudFJ1bGVzRm9yS2V5OiBJTWF0Y2gubVJ1bGVbXSwgc2VlblJ1bGVzKSB7XHJcbiAgICByYW5nZVJ1bGVzLmZvckVhY2gocmFuZ2VSdWxlID0+IHtcclxuICAgICAgICB2YXIgbmV3UnVsZSA9IE9iamVjdC5hc3NpZ24oe30sIHJhbmdlUnVsZSk7XHJcbiAgICAgICAgbmV3UnVsZS5sb3dlcmNhc2V3b3JkID0gbGN3b3JkO1xyXG4gICAgICAgIG5ld1J1bGUud29yZCA9IGxjd29yZDtcclxuICAgICAgICAvL2lmKChsY3dvcmQgPT09ICdzZXJ2aWNlcycgfHwgbGN3b3JkID09PSAnc2VydmljZScpICYmIG5ld1J1bGUucmFuZ2UucnVsZS5sb3dlcmNhc2V3b3JkLmluZGV4T2YoJ29kYXRhJyk+PTApIHtcclxuICAgICAgICAvLyAgICBjb25zb2xlLmxvZyhcImFkZGluZyBcIisgSlNPTi5zdHJpbmdpZnkobmV3UnVsZSkgKyBcIlxcblwiKTtcclxuICAgICAgICAvL31cclxuICAgICAgICAvL3RvZG86IGNoZWNrIHdoZXRoZXIgYW4gZXF1aXZhbGVudCBydWxlIGlzIGFscmVhZHkgcHJlc2VudD9cclxuICAgICAgICB2YXIgY250ID0gcnVsZXMubGVuZ3RoO1xyXG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQocnVsZXMsIG5ld1J1bGUsIHNlZW5SdWxlcyk7XHJcbiAgICB9KVxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkZENsb3NlRXhhY3RSYW5nZVJ1bGVzKHJ1bGVzOiBJTWF0Y2gubVJ1bGVbXSwgc2VlblJ1bGVzKSB7XHJcbiAgICB2YXIga2V5c01hcCA9IHt9IGFzIHsgW2tleTogc3RyaW5nXTogSU1hdGNoLm1SdWxlW10gfTtcclxuICAgIHZhciByYW5nZUtleXNNYXAgPSB7fSBhcyB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5tUnVsZVtdIH07XHJcbiAgICBydWxlcy5mb3JFYWNoKHJ1bGUgPT4ge1xyXG4gICAgICAgIGlmIChydWxlLnR5cGUgPT09IElNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCkge1xyXG4gICAgICAgICAgICAvL2tleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXSA9IDE7XHJcbiAgICAgICAgICAgIGtleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXSA9IGtleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXSB8fCBbXTtcclxuICAgICAgICAgICAga2V5c01hcFtydWxlLmxvd2VyY2FzZXdvcmRdLnB1c2gocnVsZSk7XHJcbiAgICAgICAgICAgIGlmICghcnVsZS5leGFjdE9ubHkgJiYgcnVsZS5yYW5nZSkge1xyXG4gICAgICAgICAgICAgICAgcmFuZ2VLZXlzTWFwW3J1bGUubG93ZXJjYXNld29yZF0gPSByYW5nZUtleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXSB8fCBbXTtcclxuICAgICAgICAgICAgICAgIHJhbmdlS2V5c01hcFtydWxlLmxvd2VyY2FzZXdvcmRdLnB1c2gocnVsZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoa2V5c01hcCk7XHJcbiAgICBrZXlzLnNvcnQoY21wTGVuZ3RoU29ydCk7XHJcbiAgICB2YXIgbGVuID0gMDtcclxuICAgIGtleXMuZm9yRWFjaCgoa2V5LCBpbmRleCkgPT4ge1xyXG4gICAgICAgIGlmIChrZXkubGVuZ3RoICE9IGxlbikge1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwic2hpZnQgdG8gbGVuXCIgKyBrZXkubGVuZ3RoICsgJyBhdCAnICsgaW5kZXggKyAnICcgKyBrZXkgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGVuID0ga2V5Lmxlbmd0aDtcclxuICAgIH0pO1xyXG4gICAgLy8gICBrZXlzID0ga2V5cy5zbGljZSgwLDIwMDApO1xyXG4gICAgdmFyIHJhbmdlS2V5cyA9IE9iamVjdC5rZXlzKHJhbmdlS2V5c01hcCk7XHJcbiAgICByYW5nZUtleXMuc29ydChjbXBMZW5ndGhTb3J0KTtcclxuICAgIC8vY29uc29sZS5sb2coYCAke2tleXMubGVuZ3RofSBrZXlzIGFuZCAke3JhbmdlS2V5cy5sZW5ndGh9IHJhbmdla2V5cyBgKTtcclxuICAgIHZhciBsb3cgPSAwO1xyXG4gICAgdmFyIGhpZ2ggPSAwO1xyXG4gICAgdmFyIGxhc3RsZW4gPSAwO1xyXG4gICAgdmFyIG9mZnNldHMgPSBbMCwgMCwgMCwgMCwgMCwgMF07XHJcbiAgICB2YXIgbGVuID0gcmFuZ2VLZXlzLmxlbmd0aDtcclxuICAgIGZpbmROZXh0TGVuKDAsIGtleXMsIG9mZnNldHMpO1xyXG4gICAgZmluZE5leHRMZW4oMSwga2V5cywgb2Zmc2V0cyk7XHJcbiAgICBmaW5kTmV4dExlbigyLCBrZXlzLCBvZmZzZXRzKTtcclxuXHJcbiAgICByYW5nZUtleXMuZm9yRWFjaChmdW5jdGlvbiAocmFuZ2VLZXkpIHtcclxuICAgICAgICBpZiAocmFuZ2VLZXkubGVuZ3RoICE9PSBsYXN0bGVuKSB7XHJcbiAgICAgICAgICAgIGZvciAoaSA9IGxhc3RsZW4gKyAxOyBpIDw9IHJhbmdlS2V5Lmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBmaW5kTmV4dExlbihpICsgMiwga2V5cywgb2Zmc2V0cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gICBjb25zb2xlLmxvZyhgIHNoaWZ0ZWQgdG8gJHtyYW5nZUtleS5sZW5ndGh9IHdpdGggb2Zmc2V0cyBiZWVpbmcgJHtvZmZzZXRzLmpvaW4oJyAnKX1gKTtcclxuICAgICAgICAgICAgLy8gICBjb25zb2xlLmxvZyhgIGhlcmUgMCAke29mZnNldHNbMF19IDogJHtrZXlzW01hdGgubWluKGtleXMubGVuZ3RoLTEsIG9mZnNldHNbMF0pXS5sZW5ndGh9ICAke2tleXNbTWF0aC5taW4oa2V5cy5sZW5ndGgtMSwgb2Zmc2V0c1swXSldfSBgKTtcclxuICAgICAgICAgICAgLy8gIGNvbnNvbGUubG9nKGAgaGVyZSA1LTEgICR7a2V5c1tvZmZzZXRzWzVdLTFdLmxlbmd0aH0gICR7a2V5c1tvZmZzZXRzWzVdLTFdfSBgKTtcclxuICAgICAgICAgICAgLy8gICBjb25zb2xlLmxvZyhgIGhlcmUgNSAke29mZnNldHNbNV19IDogJHtrZXlzW01hdGgubWluKGtleXMubGVuZ3RoLTEsIG9mZnNldHNbNV0pXS5sZW5ndGh9ICAke2tleXNbTWF0aC5taW4oa2V5cy5sZW5ndGgtMSwgb2Zmc2V0c1s1XSldfSBgKTtcclxuICAgICAgICAgICAgbGFzdGxlbiA9IHJhbmdlS2V5Lmxlbmd0aDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IG9mZnNldHNbMF07IGkgPCBvZmZzZXRzWzVdOyArK2kpIHtcclxuICAgICAgICAgICAgdmFyIGQgPSBEaXN0YW5jZS5jYWxjRGlzdGFuY2VBZGp1c3RlZChyYW5nZUtleSwga2V5c1tpXSk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGAke3JhbmdlS2V5Lmxlbmd0aC1rZXlzW2ldLmxlbmd0aH0gJHtkfSAke3JhbmdlS2V5fSBhbmQgJHtrZXlzW2ldfSAgYCk7XHJcbiAgICAgICAgICAgIGlmICgoZCAhPT0gMS4wKSAmJiAoZCA+PSBBbGdvbC5DdXRvZmZfcmFuZ2VDbG9zZU1hdGNoKSkge1xyXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhgd291bGQgYWRkICR7cmFuZ2VLZXl9IGZvciAke2tleXNbaV19ICR7ZH1gKTtcclxuICAgICAgICAgICAgICAgIHZhciBjbnQgPSBydWxlcy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAvLyB3ZSBvbmx5IGhhdmUgdG8gYWRkIGlmIHRoZXJlIGlzIG5vdCB5ZXQgYSBtYXRjaCBydWxlIGhlcmUgd2hpY2ggcG9pbnRzIHRvIHRoZSBzYW1lXHJcbiAgICAgICAgICAgICAgICBhZGRSYW5nZVJ1bGVzVW5sZXNzUHJlc2VudChydWxlcywga2V5c1tpXSwgcmFuZ2VLZXlzTWFwW3JhbmdlS2V5XSwga2V5c01hcFtrZXlzW2ldXSwgc2VlblJ1bGVzKTtcclxuICAgICAgICAgICAgICAgIGlmIChydWxlcy5sZW5ndGggPiBjbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGAgYWRkZWQgJHsocnVsZXMubGVuZ3RoIC0gY250KX0gcmVjb3JkcyBhdCR7cmFuZ2VLZXl9IGZvciAke2tleXNbaV19ICR7ZH1gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIC8qXHJcbiAgICBbXHJcbiAgICAgICAgWydhRUZHJywnYUVGR0gnXSxcclxuICAgICAgICBbJ2FFRkdIJywnYUVGR0hJJ10sXHJcbiAgICAgICAgWydPZGF0YScsJ09EYXRhcyddLFxyXG4gICBbJ09kYXRhJywnT2RhdGFzJ10sXHJcbiAgIFsnT2RhdGEnLCdPZGF0YiddLFxyXG4gICBbJ09kYXRhJywnVURhdGEnXSxcclxuICAgWydzZXJ2aWNlJywnc2VydmljZXMnXSxcclxuICAgWyd0aGlzIGlzZnVubnkgYW5kIG1vcmUnLCd0aGlzIGlzZnVubnkgYW5kIG1vcmVzJ10sXHJcbiAgICBdLmZvckVhY2gocmVjID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgZGlzdGFuY2UgJHtyZWNbMF19ICR7cmVjWzFdfSA6ICR7RGlzdGFuY2UuY2FsY0Rpc3RhbmNlKHJlY1swXSxyZWNbMV0pfSAgYWRmICR7RGlzdGFuY2UuY2FsY0Rpc3RhbmNlQWRqdXN0ZWQocmVjWzBdLHJlY1sxXSl9IGApO1xyXG5cclxuICAgIH0pO1xyXG4gICAgY29uc29sZS5sb2coXCJkaXN0YW5jZSBPZGF0YSBVZGF0YVwiKyBEaXN0YW5jZS5jYWxjRGlzdGFuY2UoJ09EYXRhJywnVURhdGEnKSk7XHJcbiAgICBjb25zb2xlLmxvZyhcImRpc3RhbmNlIE9kYXRhIE9kYXRiXCIrIERpc3RhbmNlLmNhbGNEaXN0YW5jZSgnT0RhdGEnLCdPRGF0YicpKTtcclxuICAgIGNvbnNvbGUubG9nKFwiZGlzdGFuY2UgT2RhdGFzIE9kYXRhXCIrIERpc3RhbmNlLmNhbGNEaXN0YW5jZSgnT0RhdGEnLCdPRGF0YWEnKSk7XHJcbiAgICBjb25zb2xlLmxvZyhcImRpc3RhbmNlIE9kYXRhcyBhYmNkZVwiKyBEaXN0YW5jZS5jYWxjRGlzdGFuY2UoJ2FiY2RlJywnYWJjZGVmJykpO1xyXG4gICAgY29uc29sZS5sb2coXCJkaXN0YW5jZSBzZXJ2aWNlcyBcIisgRGlzdGFuY2UuY2FsY0Rpc3RhbmNlKCdzZXJ2aWNlcycsJ3NlcnZpY2UnKSk7XHJcbiAgICAqL1xyXG59XHJcbnZhciBuID0gMDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2FkTW9kZWxzKG1vZGVsUGF0aD86IHN0cmluZyk6IElNYXRjaC5JTW9kZWxzIHtcclxuICAgIHZhciBvTW9kZWw6IElNYXRjaC5JTW9kZWxzO1xyXG4gICAgb01vZGVsID0ge1xyXG4gICAgICAgIGZ1bGw6IHsgZG9tYWluOiB7fSB9LFxyXG4gICAgICAgIHJhd01vZGVsczoge30sXHJcbiAgICAgICAgZG9tYWluczogW10sXHJcbiAgICAgICAgdG9vbHM6IFtdLFxyXG4gICAgICAgIHJ1bGVzOiB1bmRlZmluZWQsXHJcbiAgICAgICAgY2F0ZWdvcnk6IFtdLFxyXG4gICAgICAgIG9wZXJhdG9yczoge30sXHJcbiAgICAgICAgbVJ1bGVzOiBbXSxcclxuICAgICAgICBzZWVuUnVsZXM6IHt9LFxyXG4gICAgICAgIHJlY29yZHM6IFtdLFxyXG4gICAgICAgIG1ldGE6IHsgdDM6IHt9IH1cclxuICAgIH1cclxuICAgIHZhciB0ID0gRGF0ZS5ub3coKTtcclxuICAgIG1vZGVsUGF0aCA9IG1vZGVsUGF0aCB8fCBlbnZNb2RlbFBhdGg7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICB2YXIgYSA9IENpcmN1bGFyU2VyLmxvYWQoJy4vJyArIG1vZGVsUGF0aCArICcvX2NhY2hlZmFsc2UuanMnKTtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiZm91bmQgYSBjYWNoZSA/ICBcIiArICEhYSk7XHJcbiAgICAgICAgLy9hID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIGlmIChhKSB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiIHJldHVybiBwcmVwYXJlc2UgbW9kZWwgXCIpO1xyXG4gICAgICAgICAgICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9FTUFJTF9VU0VSKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImxvYWRlZCBtb2RlbHMgZnJvbSBjYWNoZSBpbiBcIiArIChEYXRlLm5vdygpIC0gdCkgKyBcIiBcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGE7XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coJ2Vycm9yJyArIGUpO1xyXG4gICAgICAgIC8vIG5vIGNhY2hlIGZpbGUsXHJcbiAgICB9XHJcbiAgICB2YXIgbWRscyA9IHJlYWRGaWxlQXNKU09OKCcuLycgKyBtb2RlbFBhdGggKyAnL21vZGVscy5qc29uJyk7XHJcbiAgICBtZGxzLmZvckVhY2goZnVuY3Rpb24gKHNNb2RlbE5hbWUpIHtcclxuICAgICAgICBsb2FkTW9kZWwobW9kZWxQYXRoLCBzTW9kZWxOYW1lLCBvTW9kZWwpXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBhZGQgdGhlIGNhdGVnb3JpZXMgdG8gdGhlIG1vZGVsOlxyXG4gICAgLypcclxuICAgIG9Nb2RlbC5jYXRlZ29yeS5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xyXG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywge1xyXG4gICAgICAgICAgICBjYXRlZ29yeTogXCJjYXRlZ29yeVwiLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgdHlwZTogSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JELFxyXG4gICAgICAgICAgICB3b3JkOiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgbG93ZXJjYXNld29yZDogY2F0ZWdvcnkudG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgYml0aW5kZXggOiBvTWRsLlxyXG4gICAgICAgICAgICBfcmFua2luZzogMC45NVxyXG4gICAgICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xyXG4gICAgfSk7XHJcbiAgICAqL1xyXG5cclxuICAgIHZhciBtZXRhQml0SW5kZXggPSBnZXREb21haW5CaXRJbmRleCgnbWV0YScsIG9Nb2RlbCk7XHJcblxyXG4gICAgLy8gYWRkIHRoZSBkb21haW4gbWV0YSBydWxlXHJcbiAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcclxuICAgICAgICBjYXRlZ29yeTogXCJtZXRhXCIsXHJcbiAgICAgICAgbWF0Y2hlZFN0cmluZzogXCJkb21haW5cIixcclxuICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgd29yZDogXCJkb21haW5cIixcclxuICAgICAgICBiaXRpbmRleDogbWV0YUJpdEluZGV4LFxyXG4gICAgICAgIF9yYW5raW5nOiAwLjk1XHJcbiAgICB9LCBvTW9kZWwuc2VlblJ1bGVzKTtcclxuXHJcblxyXG4gICAgdmFyIGZpbGxlckJpdEluZGV4ID0gZ2V0RG9tYWluQml0SW5kZXgoJ21ldGEnLCBvTW9kZWwpO1xyXG4gICAgLy9hZGQgYSBmaWxsZXIgcnVsZVxyXG4gICAgdmFyIGZpbGxlcnMgPSAgcmVhZEZpbGVBc0pTT04oJy4vJyArIG1vZGVsUGF0aCArICcvZmlsbGVyLmpzb24nKTtcclxuICAgIHZhciByZSA9IFwiXigoXCIgKyBmaWxsZXJzLmpvaW4oXCIpfChcIikgKyBcIikpJFwiO1xyXG4gICAgb01vZGVsLm1SdWxlcy5wdXNoKHtcclxuICAgICAgICBjYXRlZ29yeTogXCJmaWxsZXJcIixcclxuICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUCxcclxuICAgICAgICByZWdleHA6IG5ldyBSZWdFeHAocmUsIFwiaVwiKSxcclxuICAgICAgICBtYXRjaGVkU3RyaW5nOiBcImZpbGxlclwiLFxyXG4gICAgICAgIGJpdGluZGV4OiBmaWxsZXJCaXRJbmRleCxcclxuICAgICAgICBfcmFua2luZzogMC45XHJcbiAgICB9KTtcclxuXHJcbiAgICAvL2FkZCBvcGVyYXRvcnNcclxuICAgIHZhciBvcGVyYXRvcnMgPSByZWFkRmlsZUFzSlNPTignLi9yZXNvdXJjZXMvbW9kZWwvb3BlcmF0b3JzLmpzb24nKTtcclxuICAgIHZhciBvcGVyYXRvckJpdEluZGV4ID0gZ2V0RG9tYWluQml0SW5kZXgoJ29wZXJhdG9ycycsIG9Nb2RlbCk7XHJcbiAgICBPYmplY3Qua2V5cyhvcGVyYXRvcnMub3BlcmF0b3JzKS5mb3JFYWNoKGZ1bmN0aW9uIChvcGVyYXRvcikge1xyXG4gICAgICAgIGlmIChJTWF0Y2guYU9wZXJhdG9yTmFtZXMuaW5kZXhPZihvcGVyYXRvcikgPCAwKSB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKFwidW5rbm93biBvcGVyYXRvciBcIiArIG9wZXJhdG9yKTtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biBvcGVyYXRvciBcIiArIG9wZXJhdG9yKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgb01vZGVsLm9wZXJhdG9yc1tvcGVyYXRvcl0gPSBvcGVyYXRvcnMub3BlcmF0b3JzW29wZXJhdG9yXTtcclxuICAgICAgICBvTW9kZWwub3BlcmF0b3JzW29wZXJhdG9yXS5vcGVyYXRvciA9IDxJTWF0Y2guT3BlcmF0b3JOYW1lPm9wZXJhdG9yO1xyXG4gICAgICAgIE9iamVjdC5mcmVlemUob01vZGVsLm9wZXJhdG9yc1tvcGVyYXRvcl0pO1xyXG4gICAgICAgIHZhciB3b3JkID0gb3BlcmF0b3I7XHJcbiAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcIm9wZXJhdG9yXCIsXHJcbiAgICAgICAgICAgIHdvcmQ6IHdvcmQudG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgbG93ZXJjYXNld29yZDogd29yZC50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IHdvcmQsXHJcbiAgICAgICAgICAgIGJpdGluZGV4OiBvcGVyYXRvckJpdEluZGV4LFxyXG4gICAgICAgICAgICBfcmFua2luZzogMC45XHJcbiAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgLy8gYWRkIGFsbCBzeW5vbnltc1xyXG4gICAgICAgIGlmIChvcGVyYXRvcnMuc3lub255bXNbb3BlcmF0b3JdKSB7XHJcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKG9wZXJhdG9ycy5zeW5vbnltc1tvcGVyYXRvcl0pLmZvckVhY2goZnVuY3Rpb24gKHN5bm9ueW0pIHtcclxuICAgICAgICAgICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBcIm9wZXJhdG9yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgd29yZDogc3lub255bS50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyY2FzZXdvcmQ6IHN5bm9ueW0udG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXHJcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb3BlcmF0b3IsXHJcbiAgICAgICAgICAgICAgICAgICAgYml0aW5kZXg6IG9wZXJhdG9yQml0SW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOVxyXG4gICAgICAgICAgICAgICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgLypcclxuICAgICAgICB9KVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICBjYXRlZ29yeTogXCJmaWxsZXJcIixcclxuICAgICAgICAgIHR5cGU6IDEsXHJcbiAgICAgICAgICByZWdleHA6IC9eKChzdGFydCl8KHNob3cpfChmcm9tKXwoaW4pKSQvaSxcclxuICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IFwiZmlsbGVyXCIsXHJcbiAgICAgICAgICBfcmFua2luZzogMC45XHJcbiAgICAgICAgfSxcclxuICAgICovXHJcbiAgICBvTW9kZWwubVJ1bGVzID0gb01vZGVsLm1SdWxlcy5zb3J0KElucHV0RmlsdGVyUnVsZXMuY21wTVJ1bGUpO1xyXG4gICAgYWRkQ2xvc2VFeGFjdFJhbmdlUnVsZXMob01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XHJcbiAgICBvTW9kZWwubVJ1bGVzID0gb01vZGVsLm1SdWxlcy5zb3J0KElucHV0RmlsdGVyUnVsZXMuY21wTVJ1bGUpO1xyXG4gICAgZm9yY2VHQygpO1xyXG4gICAgb01vZGVsLnJ1bGVzID0gc3BsaXRSdWxlcyhvTW9kZWwubVJ1bGVzKTtcclxuICAgIGZvcmNlR0MoKTtcclxuICAgIG9Nb2RlbC50b29scyA9IG9Nb2RlbC50b29scy5zb3J0KFRvb2xzLmNtcFRvb2xzKTtcclxuICAgIGRlbGV0ZSBvTW9kZWwuc2VlblJ1bGVzO1xyXG4gICAgZGVidWdsb2coJ3NhdmluZycpO1xyXG4gICAgZm9yY2VHQygpO1xyXG4gICAgQ2lyY3VsYXJTZXIuc2F2ZSgnLi8nICsgbW9kZWxQYXRoICsgJy9fY2FjaGVmYWxzZS5qcycsIG9Nb2RlbCk7XHJcbiAgICBmb3JjZUdDKCk7XHJcbiAgICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9FTUFJTF9VU0VSKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJsb2FkZWQgbW9kZWxzIGJ5IGNhbGN1bGF0aW9uIGluIFwiICsgKERhdGUubm93KCkgLSB0KSArIFwiIFwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBvTW9kZWw7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0Q2F0ZWdvcmllc0J5SW1wb3J0YW5jZShtYXA6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklDYXRlZ29yeURlc2MgfSwgY2F0czogc3RyaW5nW10pOiBzdHJpbmdbXSB7XHJcbiAgICB2YXIgcmVzID0gY2F0cy5zbGljZSgwKTtcclxuICAgIHJlcy5zb3J0KHJhbmtDYXRlZ29yeUJ5SW1wb3J0YW5jZS5iaW5kKHVuZGVmaW5lZCwgbWFwKSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmFua0NhdGVnb3J5QnlJbXBvcnRhbmNlKG1hcDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSUNhdGVnb3J5RGVzYyB9LCBjYXRhOiBzdHJpbmcsIGNhdGI6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgICB2YXIgY2F0QURlc2MgPSBtYXBbY2F0YV07XHJcbiAgICB2YXIgY2F0QkRlc2MgPSBtYXBbY2F0Yl07XHJcbiAgICBpZiAoY2F0YSA9PT0gY2F0Yikge1xyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgfVxyXG4gICAgLy8gaWYgYSBpcyBiZWZvcmUgYiwgcmV0dXJuIC0xXHJcbiAgICBpZiAoY2F0QURlc2MgJiYgIWNhdEJEZXNjKSB7XHJcbiAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfVxyXG4gICAgaWYgKCFjYXRBRGVzYyAmJiBjYXRCRGVzYykge1xyXG4gICAgICAgIHJldHVybiArMTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcHJpb0EgPSAoY2F0QURlc2MgJiYgY2F0QURlc2MuaW1wb3J0YW5jZSkgfHwgOTk7XHJcbiAgICB2YXIgcHJpb0IgPSAoY2F0QkRlc2MgJiYgY2F0QkRlc2MuaW1wb3J0YW5jZSkgfHwgOTk7XHJcbiAgICAvLyBsb3dlciBwcmlvIGdvZXMgdG8gZnJvbnRcclxuICAgIHZhciByID0gcHJpb0EgLSBwcmlvQjtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgICAgcmV0dXJuIHI7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY2F0YS5sb2NhbGVDb21wYXJlKGNhdGIpO1xyXG59XHJcblxyXG5jb25zdCBNZXRhRiA9IE1ldGEuZ2V0TWV0YUZhY3RvcnkoKTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRPcGVyYXRvcihtZGw6IElNYXRjaC5JTW9kZWxzLCBvcGVyYXRvcjogc3RyaW5nKTogSU1hdGNoLklPcGVyYXRvciB7XHJcbiAgICByZXR1cm4gbWRsLm9wZXJhdG9yc1tvcGVyYXRvcl07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXN1bHRBc0FycmF5KG1kbDogSU1hdGNoLklNb2RlbHMsIGE6IE1ldGEuSU1ldGEsIHJlbDogTWV0YS5JTWV0YSk6IE1ldGEuSU1ldGFbXSB7XHJcbiAgICBpZiAocmVsLnRvVHlwZSgpICE9PSAncmVsYXRpb24nKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZXhwZWN0IHJlbGF0aW9uIGFzIDJuZCBhcmdcIik7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJlcyA9IG1kbC5tZXRhLnQzW2EudG9GdWxsU3RyaW5nKCldICYmXHJcbiAgICAgICAgbWRsLm1ldGEudDNbYS50b0Z1bGxTdHJpbmcoKV1bcmVsLnRvRnVsbFN0cmluZygpXTtcclxuICAgIGlmICghcmVzKSB7XHJcbiAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHJlcykuc29ydCgpLm1hcChNZXRhRi5wYXJzZUlNZXRhKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldENhdGVnb3JpZXNGb3JEb21haW4odGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzLCBkb21haW46IHN0cmluZyk6IHN0cmluZ1tdIHtcclxuICAgIGlmICh0aGVNb2RlbC5kb21haW5zLmluZGV4T2YoZG9tYWluKSA8IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEb21haW4gXFxcIlwiICsgZG9tYWluICsgXCJcXFwiIG5vdCBwYXJ0IG9mIG1vZGVsXCIpO1xyXG4gICAgfVxyXG4gICAgdmFyIHJlcyA9IGdldFJlc3VsdEFzQXJyYXkodGhlTW9kZWwsIE1ldGFGLkRvbWFpbihkb21haW4pLCBNZXRhRi5SZWxhdGlvbihNZXRhLlJFTEFUSU9OX2hhc0NhdGVnb3J5KSk7XHJcbiAgICByZXR1cm4gTWV0YS5nZXRTdHJpbmdBcnJheShyZXMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGFibGVDb2x1bW5zKHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscywgZG9tYWluOiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgICBpZiAodGhlTW9kZWwuZG9tYWlucy5pbmRleE9mKGRvbWFpbikgPCAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG9tYWluIFxcXCJcIiArIGRvbWFpbiArIFwiXFxcIiBub3QgcGFydCBvZiBtb2RlbFwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGVNb2RlbC5yYXdNb2RlbHNbZG9tYWluXS5jb2x1bW5zLnNsaWNlKDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JjZUdDKCkge1xyXG4gICAgaWYoZ2xvYmFsICYmIGdsb2JhbC5nYykge1xyXG4gICAgICAgIGdsb2JhbC5nYygpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogUmV0dXJuIGFsbCBjYXRlZ29yaWVzIG9mIGEgZG9tYWluIHdoaWNoIGNhbiBhcHBlYXIgb24gYSB3b3JkLFxyXG4gKiB0aGVzZSBhcmUgdHlwaWNhbGx5IHRoZSB3b3JkaW5kZXggZG9tYWlucyArIGVudHJpZXMgZ2VuZXJhdGVkIGJ5IGdlbmVyaWMgcnVsZXNcclxuICpcclxuICogVGhlIGN1cnJlbnQgaW1wbGVtZW50YXRpb24gaXMgYSBzaW1wbGlmaWNhdGlvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFBvdGVudGlhbFdvcmRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscywgZG9tYWluOiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgICAvLyB0aGlzIGlzIGEgc2ltcGxpZmllZCB2ZXJzaW9uXHJcbiAgICByZXR1cm4gZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbih0aGVNb2RlbCwgZG9tYWluKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldERvbWFpbnNGb3JDYXRlZ29yeSh0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMsIGNhdGVnb3J5OiBzdHJpbmcpOiBzdHJpbmdbXSB7XHJcbiAgICBpZiAodGhlTW9kZWwuY2F0ZWdvcnkuaW5kZXhPZihjYXRlZ29yeSkgPCAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2F0ZWdvcnkgXFxcIlwiICsgY2F0ZWdvcnkgKyBcIlxcXCIgbm90IHBhcnQgb2YgbW9kZWxcIik7XHJcbiAgICB9XHJcbiAgICB2YXIgcmVzID0gZ2V0UmVzdWx0QXNBcnJheSh0aGVNb2RlbCwgTWV0YUYuQ2F0ZWdvcnkoY2F0ZWdvcnkpLCBNZXRhRi5SZWxhdGlvbihNZXRhLlJFTEFUSU9OX2lzQ2F0ZWdvcnlPZikpO1xyXG4gICAgcmV0dXJuIE1ldGEuZ2V0U3RyaW5nQXJyYXkocmVzKTtcclxufVxyXG5cclxuLypcclxuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yeShtb2RlbDogSU1hdGNoLklNb2RlbHMsIGNhdGVnb3J5OiBzdHJpbmcsIHdvcmRzb25seTogYm9vbGVhbik6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9IHtcclxuICAgIHZhciByZXMgPSB7fTtcclxuICAgIC8vXHJcbiAgICB2YXIgZm4gPSB3b3Jkc29ubHkgPyBnZXRQb3RlbnRpYWxXb3JkQ2F0ZWdvcmllc0ZvckRvbWFpbiA6IGdldENhdGVnb3JpZXNGb3JEb21haW47XHJcbiAgICB2YXIgZG9tYWlucyA9IGdldERvbWFpbnNGb3JDYXRlZ29yeShtb2RlbCwgY2F0ZWdvcnkpO1xyXG4gICAgZG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uIChkb21haW4pIHtcclxuICAgICAgICBmbihtb2RlbCwgZG9tYWluKS5mb3JFYWNoKGZ1bmN0aW9uICh3b3JkY2F0KSB7XHJcbiAgICAgICAgICAgIHJlc1t3b3JkY2F0XSA9IHRydWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcclxuICAgIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcmllcyhtb2RlbDogSU1hdGNoLklNb2RlbHMsIGNhdGVnb3JpZXM6IHN0cmluZ1tdLCB3b3Jkc29ubHk6IGJvb2xlYW4pOiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSB7XHJcbiAgICB2YXIgcmVzID0ge307XHJcbiAgICAvL1xyXG4gICAgdmFyIGZuID0gd29yZHNvbmx5ID8gZ2V0UG90ZW50aWFsV29yZENhdGVnb3JpZXNGb3JEb21haW4gOiBnZXRDYXRlZ29yaWVzRm9yRG9tYWluO1xyXG4gICAgdmFyIGRvbWFpbnMgPSB1bmRlZmluZWQ7XHJcbiAgICBjYXRlZ29yaWVzLmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XHJcbiAgICAgICAgdmFyIGNhdGRvbWFpbnMgPSBnZXREb21haW5zRm9yQ2F0ZWdvcnkobW9kZWwsIGNhdGVnb3J5KVxyXG4gICAgICAgIGlmICghZG9tYWlucykge1xyXG4gICAgICAgICAgICBkb21haW5zID0gY2F0ZG9tYWlucztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkb21haW5zID0gXy5pbnRlcnNlY3Rpb24oZG9tYWlucywgY2F0ZG9tYWlucyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBpZiAoZG9tYWlucy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhdGVnb3JpZXMgJyArIFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hQW5kKGNhdGVnb3JpZXMpICsgJyBoYXZlIG5vIGNvbW1vbiBkb21haW4uJylcclxuICAgIH1cclxuICAgIGRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbiAoZG9tYWluKSB7XHJcbiAgICAgICAgZm4obW9kZWwsIGRvbWFpbikuZm9yRWFjaChmdW5jdGlvbiAod29yZGNhdCkge1xyXG4gICAgICAgICAgICByZXNbd29yZGNhdF0gPSB0cnVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcbiovXHJcblxyXG4vKipcclxuICogZ2l2ZW5hICBzZXQgIG9mIGNhdGVnb3JpZXMsIHJldHVybiBhIHN0cnVjdHVyZVxyXG4gKlxyXG4gKlxyXG4gKiB7IGRvbWFpbnMgOiBbXCJET01BSU4xXCIsIFwiRE9NQUlOMlwiXSxcclxuICogICBjYXRlZ29yeVNldCA6IHsgICBjYXQxIDogdHJ1ZSwgY2F0MiA6IHRydWUsIC4uLn1cclxuICogfVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldERvbWFpbkNhdGVnb3J5RmlsdGVyRm9yVGFyZ2V0Q2F0ZWdvcmllcyhtb2RlbDogSU1hdGNoLklNb2RlbHMsIGNhdGVnb3JpZXM6IHN0cmluZ1tdLCB3b3Jkc29ubHk6IGJvb2xlYW4pOiBJTWF0Y2guSURvbWFpbkNhdGVnb3J5RmlsdGVyICB7XHJcbiAgICB2YXIgcmVzID0ge307XHJcbiAgICAvL1xyXG4gICAgdmFyIGZuID0gd29yZHNvbmx5ID8gZ2V0UG90ZW50aWFsV29yZENhdGVnb3JpZXNGb3JEb21haW4gOiBnZXRDYXRlZ29yaWVzRm9yRG9tYWluO1xyXG4gICAgdmFyIGRvbWFpbnMgPSB1bmRlZmluZWQgYXMgc3RyaW5nW107XHJcbiAgICBjYXRlZ29yaWVzLmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XHJcbiAgICAgICAgdmFyIGNhdGRvbWFpbnMgPSBnZXREb21haW5zRm9yQ2F0ZWdvcnkobW9kZWwsIGNhdGVnb3J5KVxyXG4gICAgICAgIGlmICghZG9tYWlucykge1xyXG4gICAgICAgICAgICBkb21haW5zID0gY2F0ZG9tYWlucztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkb21haW5zID0gXy5pbnRlcnNlY3Rpb24oZG9tYWlucywgY2F0ZG9tYWlucyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBpZiAoZG9tYWlucy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhdGVnb3JpZXMgJyArIFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hQW5kKGNhdGVnb3JpZXMpICsgJyBoYXZlIG5vIGNvbW1vbiBkb21haW4uJylcclxuICAgIH1cclxuICAgIGRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbiAoZG9tYWluKSB7XHJcbiAgICAgICAgZm4obW9kZWwsIGRvbWFpbikuZm9yRWFjaChmdW5jdGlvbiAod29yZGNhdCkge1xyXG4gICAgICAgICAgICByZXNbd29yZGNhdF0gPSB0cnVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICByZXR1cm4geyBkb21haW5zOiBkb21haW5zLFxyXG4gICAgICAgICAgICAgY2F0ZWdvcnlTZXQgOiByZXN9O1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldERvbWFpbkNhdGVnb3J5RmlsdGVyRm9yVGFyZ2V0Q2F0ZWdvcnkobW9kZWw6IElNYXRjaC5JTW9kZWxzLCBjYXRlZ29yeTogc3RyaW5nLCB3b3Jkc29ubHk6IGJvb2xlYW4pOiBJTWF0Y2guSURvbWFpbkNhdGVnb3J5RmlsdGVyICB7XHJcbiAgICByZXR1cm4gZ2V0RG9tYWluQ2F0ZWdvcnlGaWx0ZXJGb3JUYXJnZXRDYXRlZ29yaWVzKG1vZGVsLCBbY2F0ZWdvcnldLHdvcmRzb25seSk7XHJcbn1cclxuXHJcblxyXG4iLCIvKipcbiAqIEZ1bmN0aW9uYWxpdHkgbWFuYWdpbmcgdGhlIG1hdGNoIG1vZGVsc1xuICpcbiAqIEBmaWxlXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ21vZGVsJyk7XG52YXIgbG9nZ2VyID0gcmVxdWlyZShcIi4uL3V0aWxzL2xvZ2dlclwiKTtcbnZhciBsb2FkbG9nID0gbG9nZ2VyLmxvZ2dlcignbW9kZWxsb2FkJywgJycpO1xudmFyIElNYXRjaCA9IHJlcXVpcmUoXCIuLi9tYXRjaC9pZm1hdGNoXCIpO1xudmFyIElucHV0RmlsdGVyUnVsZXMgPSByZXF1aXJlKFwiLi4vbWF0Y2gvaW5wdXRGaWx0ZXJSdWxlc1wiKTtcbnZhciBUb29scyA9IHJlcXVpcmUoXCIuLi9tYXRjaC90b29sc1wiKTtcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBNZXRhID0gcmVxdWlyZShcIi4vbWV0YVwiKTtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuLi91dGlscy91dGlsc1wiKTtcbnZhciBDaXJjdWxhclNlciA9IHJlcXVpcmUoXCIuLi91dGlscy9jaXJjdWxhcnNlclwiKTtcbnZhciBwcm9jZXNzID0gcmVxdWlyZShcInByb2Nlc3NcIik7XG52YXIgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIik7XG4vKipcbiAqIHRoZSBtb2RlbCBwYXRoLCBtYXkgYmUgY29udHJvbGxlZCB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAqL1xudmFyIGVudk1vZGVsUGF0aCA9IHByb2Nlc3MuZW52W1wiQUJPVF9NT0RFTFBBVEhcIl0gfHwgXCJ0ZXN0bW9kZWxcIjtcbnZhciBBUlJfTU9ERUxfUFJPUEVSVElFUyA9IFtcImRvbWFpblwiLCBcImJpdGluZGV4XCIsIFwiZGVmYXVsdGtleWNvbHVtblwiLCBcImRlZmF1bHR1cmlcIiwgXCJjYXRlZ29yeURlc2NyaWJlZFwiLCBcImNvbHVtbnNcIiwgXCJkZXNjcmlwdGlvblwiLCBcInRvb2xcIiwgXCJ0b29saGlkZGVuXCIsIFwic3lub255bXNcIiwgXCJjYXRlZ29yeVwiLCBcIndvcmRpbmRleFwiLCBcImV4YWN0bWF0Y2hcIiwgXCJoaWRkZW5cIl07XG5mdW5jdGlvbiBhZGRTeW5vbnltcyhzeW5vbnltcywgY2F0ZWdvcnksIHN5bm9ueW1Gb3IsIGJpdGluZGV4LCBtUnVsZXMsIHNlZW4pIHtcbiAgICBzeW5vbnltcy5mb3JFYWNoKGZ1bmN0aW9uIChzeW4pIHtcbiAgICAgICAgdmFyIG9SdWxlID0ge1xuICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogc3lub255bUZvcixcbiAgICAgICAgICAgIHR5cGU6IDAgLyogV09SRCAqLyxcbiAgICAgICAgICAgIHdvcmQ6IHN5bixcbiAgICAgICAgICAgIGJpdGluZGV4OiBiaXRpbmRleCxcbiAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XG4gICAgICAgIH07XG4gICAgICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJpbnNlcnRpbmcgc3lub255bVwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUpKSA6ICctJyk7XG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQobVJ1bGVzLCBvUnVsZSwgc2Vlbik7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBnZXRSdWxlS2V5KHJ1bGUpIHtcbiAgICB2YXIgcjEgPSBydWxlLm1hdGNoZWRTdHJpbmcgKyBcIi18LVwiICsgcnVsZS5jYXRlZ29yeSArIFwiIC18LSBcIiArIHJ1bGUudHlwZSArIFwiIC18LSBcIiArIHJ1bGUud29yZCArIFwiIFwiO1xuICAgIGlmIChydWxlLnJhbmdlKSB7XG4gICAgICAgIHZhciByMiA9IGdldFJ1bGVLZXkocnVsZS5yYW5nZS5ydWxlKTtcbiAgICAgICAgcjEgKz0gXCIgLXwtIFwiICsgcnVsZS5yYW5nZS5sb3cgKyBcIi9cIiArIHJ1bGUucmFuZ2UuaGlnaCArIFwiIC18LSBcIiArIHIyO1xuICAgIH1cbiAgICByZXR1cm4gcjE7XG59XG52YXIgQnJlYWtkb3duID0gcmVxdWlyZShcIi4uL21hdGNoL2JyZWFrZG93blwiKTtcbi8qIGdpdmVuIGEgcnVsZSB3aGljaCByZXByZXNlbnRzIGEgd29yZCBzZXF1ZW5jZSB3aGljaCBpcyBzcGxpdCBkdXJpbmcgdG9rZW5pemF0aW9uICovXG5mdW5jdGlvbiBhZGRCZXN0U3BsaXQobVJ1bGVzLCBydWxlLCBzZWVuUnVsZXMpIHtcbiAgICAvL2lmKCFnbG9iYWxfQWRkU3BsaXRzKSB7XG4gICAgLy8gICAgcmV0dXJuO1xuICAgIC8vfVxuICAgIGlmIChydWxlLnR5cGUgIT09IDAgLyogV09SRCAqLykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBiZXN0ID0gQnJlYWtkb3duLm1ha2VNYXRjaFBhdHRlcm4ocnVsZS5sb3dlcmNhc2V3b3JkKTtcbiAgICBpZiAoIWJlc3QpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgbmV3UnVsZSA9IHtcbiAgICAgICAgY2F0ZWdvcnk6IHJ1bGUuY2F0ZWdvcnksXG4gICAgICAgIG1hdGNoZWRTdHJpbmc6IHJ1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgYml0aW5kZXg6IHJ1bGUuYml0aW5kZXgsXG4gICAgICAgIHdvcmQ6IGJlc3QubG9uZ2VzdFRva2VuLFxuICAgICAgICB0eXBlOiAwLFxuICAgICAgICBsb3dlcmNhc2V3b3JkOiBiZXN0Lmxvbmdlc3RUb2tlbixcbiAgICAgICAgX3Jhbmtpbmc6IDAuOTUsXG4gICAgICAgIC8vICAgIGV4YWN0T25seSA6IHJ1bGUuZXhhY3RPbmx5LFxuICAgICAgICByYW5nZTogYmVzdC5zcGFuXG4gICAgfTtcbiAgICBpZiAocnVsZS5leGFjdE9ubHkpIHtcbiAgICAgICAgbmV3UnVsZS5leGFjdE9ubHkgPSBydWxlLmV4YWN0T25seTtcbiAgICB9XG4gICAgO1xuICAgIG5ld1J1bGUucmFuZ2UucnVsZSA9IHJ1bGU7XG4gICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChtUnVsZXMsIG5ld1J1bGUsIHNlZW5SdWxlcyk7XG59XG5leHBvcnRzLmFkZEJlc3RTcGxpdCA9IGFkZEJlc3RTcGxpdDtcbmZ1bmN0aW9uIGluc2VydFJ1bGVJZk5vdFByZXNlbnQobVJ1bGVzLCBydWxlLCBzZWVuUnVsZXMpIHtcbiAgICBpZiAocnVsZS50eXBlICE9PSAwIC8qIFdPUkQgKi8pIHtcbiAgICAgICAgbVJ1bGVzLnB1c2gocnVsZSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKChydWxlLndvcmQgPT09IHVuZGVmaW5lZCkgfHwgKHJ1bGUubWF0Y2hlZFN0cmluZyA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2lsbGVnYWwgcnVsZScgKyBKU09OLnN0cmluZ2lmeShydWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgdmFyIHIgPSBnZXRSdWxlS2V5KHJ1bGUpO1xuICAgIC8qIGlmKCAocnVsZS53b3JkID09PSBcInNlcnZpY2VcIiB8fCBydWxlLndvcmQ9PT0gXCJzZXJ2aWNlc1wiKSAmJiByLmluZGV4T2YoJ09EYXRhJykgPj0gMCkge1xuICAgICAgICAgY29uc29sZS5sb2coXCJydWxla2V5IGlzXCIgKyByKTtcbiAgICAgICAgIGNvbnNvbGUubG9nKFwicHJlc2VuY2UgaXMgXCIgKyBKU09OLnN0cmluZ2lmeShzZWVuUnVsZXNbcl0pKTtcbiAgICAgfSovXG4gICAgcnVsZS5sb3dlcmNhc2V3b3JkID0gcnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKHNlZW5SdWxlc1tyXSkge1xuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiQXR0ZW1wdGluZyB0byBpbnNlcnQgZHVwbGljYXRlXCIgKyBKU09OLnN0cmluZ2lmeShydWxlLCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgICAgICAgdmFyIGR1cGxpY2F0ZXMgPSBzZWVuUnVsZXNbcl0uZmlsdGVyKGZ1bmN0aW9uIChvRW50cnkpIHtcbiAgICAgICAgICAgIHJldHVybiAwID09PSBJbnB1dEZpbHRlclJ1bGVzLmNvbXBhcmVNUnVsZUZ1bGwob0VudHJ5LCBydWxlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChkdXBsaWNhdGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzZWVuUnVsZXNbcl0gPSAoc2VlblJ1bGVzW3JdIHx8IFtdKTtcbiAgICBzZWVuUnVsZXNbcl0ucHVzaChydWxlKTtcbiAgICBpZiAocnVsZS53b3JkID09PSBcIlwiKSB7XG4gICAgICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoJ1NraXBwaW5nIHJ1bGUgd2l0aCBlbXRweSB3b3JkICcgKyBKU09OLnN0cmluZ2lmeShydWxlLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XG4gICAgICAgIGxvYWRsb2coJ1NraXBwaW5nIHJ1bGUgd2l0aCBlbXRweSB3b3JkICcgKyBKU09OLnN0cmluZ2lmeShydWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBtUnVsZXMucHVzaChydWxlKTtcbiAgICBhZGRCZXN0U3BsaXQobVJ1bGVzLCBydWxlLCBzZWVuUnVsZXMpO1xuICAgIHJldHVybjtcbn1cbmZ1bmN0aW9uIHJlYWRGaWxlQXNKU09OKGZpbGVuYW1lKSB7XG4gICAgdmFyIGRhdGEgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZW5hbWUsICd1dGYtOCcpO1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkNvbnRlbnQgb2YgZmlsZSBcIiArIGZpbGVuYW1lICsgXCIgaXMgbm8ganNvblwiICsgZSk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5mdW5jdGlvbiBsb2FkTW9kZWxEYXRhKG1vZGVsUGF0aCwgb01kbCwgc01vZGVsTmFtZSwgb01vZGVsKSB7XG4gICAgLy8gcmVhZCB0aGUgZGF0YSAtPlxuICAgIC8vIGRhdGEgaXMgcHJvY2Vzc2VkIGludG8gbVJ1bGVzIGRpcmVjdGx5LFxuICAgIHZhciBiaXRpbmRleCA9IG9NZGwuYml0aW5kZXg7XG4gICAgdmFyIHNGaWxlTmFtZSA9ICgnLi8nICsgbW9kZWxQYXRoICsgJy8nICsgc01vZGVsTmFtZSArIFwiLmRhdGEuanNvblwiKTtcbiAgICB2YXIgb01kbERhdGEgPSByZWFkRmlsZUFzSlNPTihzRmlsZU5hbWUpO1xuICAgIG9NZGxEYXRhLmZvckVhY2goZnVuY3Rpb24gKG9FbnRyeSkge1xuICAgICAgICBpZiAoIW9FbnRyeS5kb21haW4pIHtcbiAgICAgICAgICAgIG9FbnRyeS5fZG9tYWluID0gb01kbC5kb21haW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvRW50cnkudG9vbCAmJiBvTWRsLnRvb2wubmFtZSkge1xuICAgICAgICAgICAgb0VudHJ5LnRvb2wgPSBvTWRsLnRvb2wubmFtZTtcbiAgICAgICAgfVxuICAgICAgICBvTW9kZWwucmVjb3Jkcy5wdXNoKG9FbnRyeSk7XG4gICAgICAgIG9NZGwuY2F0ZWdvcnkuZm9yRWFjaChmdW5jdGlvbiAoY2F0KSB7XG4gICAgICAgICAgICBpZiAob0VudHJ5W2NhdF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgb0VudHJ5W2NhdF0gPSBcIm4vYVwiO1xuICAgICAgICAgICAgICAgIHZhciBidWcgPSBcIklOQ09OU0lTVEVOVCo+IE1vZGVsRGF0YSBcIiArIHNGaWxlTmFtZSArIFwiIGRvZXMgbm90IGNvbnRhaW4gY2F0ZWdvcnkgXCIgKyBjYXQgKyBcIiB3aXRoIHZhbHVlICd1bmRlZmluZWQnLCB1bmRlZmluZWQgaXMgaWxsZWdhbCB2YWx1ZSwgdXNlIG4vYSBcIiArIEpTT04uc3RyaW5naWZ5KG9FbnRyeSkgKyBcIlwiO1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKGJ1Zyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBvTWRsLndvcmRpbmRleC5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgaWYgKG9FbnRyeVtjYXRlZ29yeV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiSU5DT05TSVNURU5UKj4gTW9kZWxEYXRhIFwiICsgc0ZpbGVOYW1lICsgXCIgZG9lcyBub3QgY29udGFpbiBjYXRlZ29yeSBcIiArIGNhdGVnb3J5ICsgXCIgb2Ygd29yZGluZGV4XCIgKyBKU09OLnN0cmluZ2lmeShvRW50cnkpICsgXCJcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9FbnRyeVtjYXRlZ29yeV0gIT09IFwiKlwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNTdHJpbmcgPSBvRW50cnlbY2F0ZWdvcnldO1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwicHVzaGluZyBydWxlIHdpdGggXCIgKyBjYXRlZ29yeSArIFwiIC0+IFwiICsgc1N0cmluZyk7XG4gICAgICAgICAgICAgICAgdmFyIG9SdWxlID0ge1xuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IHNTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IDAgLyogV09SRCAqLyxcbiAgICAgICAgICAgICAgICAgICAgd29yZDogc1N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgYml0aW5kZXg6IGJpdGluZGV4LFxuICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogMC45NVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKG9NZGwuZXhhY3RtYXRjaCAmJiBvTWRsLmV4YWN0bWF0Y2guaW5kZXhPZihjYXRlZ29yeSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICBvUnVsZS5leGFjdE9ubHkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIG9SdWxlLCBvTW9kZWwuc2VlblJ1bGVzKTtcbiAgICAgICAgICAgICAgICBpZiAob01kbERhdGEuc3lub255bXMgJiYgb01kbERhdGEuc3lub255bXNbY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZFN5bm9ueW1zKG9NZGxEYXRhLnN5bm9ueW1zW2NhdGVnb3J5XSwgY2F0ZWdvcnksIHNTdHJpbmcsIGJpdGluZGV4LCBvTW9kZWwubVJ1bGVzLCBvTW9kZWwuc2VlblJ1bGVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9FbnRyeS5zeW5vbnltcyAmJiBvRW50cnkuc3lub255bXNbY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZFN5bm9ueW1zKG9FbnRyeS5zeW5vbnltc1tjYXRlZ29yeV0sIGNhdGVnb3J5LCBzU3RyaW5nLCBiaXRpbmRleCwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGxvYWRNb2RlbChtb2RlbFBhdGgsIHNNb2RlbE5hbWUsIG9Nb2RlbCkge1xuICAgIGRlYnVnbG9nKFwiIGxvYWRpbmcgXCIgKyBzTW9kZWxOYW1lICsgXCIgLi4uLlwiKTtcbiAgICB2YXIgb01kbCA9IHJlYWRGaWxlQXNKU09OKCcuLycgKyBtb2RlbFBhdGggKyAnLycgKyBzTW9kZWxOYW1lICsgXCIubW9kZWwuanNvblwiKTtcbiAgICBtZXJnZU1vZGVsSnNvbihzTW9kZWxOYW1lLCBvTWRsLCBvTW9kZWwpO1xuICAgIGxvYWRNb2RlbERhdGEobW9kZWxQYXRoLCBvTWRsLCBzTW9kZWxOYW1lLCBvTW9kZWwpO1xufVxuZnVuY3Rpb24gZ2V0RG9tYWluQml0SW5kZXgoZG9tYWluLCBvTW9kZWwpIHtcbiAgICB2YXIgaW5kZXggPSBvTW9kZWwuZG9tYWlucy5pbmRleE9mKGRvbWFpbik7XG4gICAgaWYgKGluZGV4IDwgMCkge1xuICAgICAgICBpbmRleCA9IG9Nb2RlbC5kb21haW5zLmxlbmd0aDtcbiAgICB9XG4gICAgaWYgKGluZGV4ID49IDMyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInRvbyBtYW55IGRvbWFpbiBmb3Igc2luZ2xlIDMyIGJpdCBpbmRleFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIDB4MDAwMSA8PCBpbmRleDtcbn1cbmV4cG9ydHMuZ2V0RG9tYWluQml0SW5kZXggPSBnZXREb21haW5CaXRJbmRleDtcbmZ1bmN0aW9uIG1lcmdlTW9kZWxKc29uKHNNb2RlbE5hbWUsIG9NZGwsIG9Nb2RlbCkge1xuICAgIHZhciBjYXRlZ29yeURlc2NyaWJlZE1hcCA9IHt9O1xuICAgIG9NZGwuYml0aW5kZXggPSBnZXREb21haW5CaXRJbmRleChvTWRsLmRvbWFpbiwgb01vZGVsKTtcbiAgICBvTWRsLmNhdGVnb3J5RGVzY3JpYmVkID0gW107XG4gICAgLy8gcmVjdGlmeSBjYXRlZ29yeVxuICAgIG9NZGwuY2F0ZWdvcnkgPSBvTWRsLmNhdGVnb3J5Lm1hcChmdW5jdGlvbiAoY2F0KSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2F0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICByZXR1cm4gY2F0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgY2F0Lm5hbWUgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTWlzc2luZyBuYW1lIGluIG9iamVjdCB0eXBlZCBjYXRlZ29yeSBpbiBcIiArIEpTT04uc3RyaW5naWZ5KGNhdCkgKyBcIiBpbiBtb2RlbCBcIiArIHNNb2RlbE5hbWUpO1xuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KC0xKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRlZ29yeURlc2NyaWJlZE1hcFtjYXQubmFtZV0gPSBjYXQ7XG4gICAgICAgIG9NZGwuY2F0ZWdvcnlEZXNjcmliZWQucHVzaChjYXQpO1xuICAgICAgICByZXR1cm4gY2F0Lm5hbWU7XG4gICAgfSk7XG4gICAgLy8gYWRkIHRoZSBjYXRlZ29yaWVzIHRvIHRoZSBtb2RlbDpcbiAgICBvTWRsLmNhdGVnb3J5LmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQob01vZGVsLm1SdWxlcywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6IFwiY2F0ZWdvcnlcIixcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IGNhdGVnb3J5LFxuICAgICAgICAgICAgdHlwZTogMCAvKiBXT1JEICovLFxuICAgICAgICAgICAgd29yZDogY2F0ZWdvcnksXG4gICAgICAgICAgICBsb3dlcmNhc2V3b3JkOiBjYXRlZ29yeS50b0xvd2VyQ2FzZSgpLFxuICAgICAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXgsXG4gICAgICAgICAgICBfcmFua2luZzogMC45NVxuICAgICAgICB9LCBvTW9kZWwuc2VlblJ1bGVzKTtcbiAgICB9KTtcbiAgICBpZiAob01vZGVsLmRvbWFpbnMuaW5kZXhPZihvTWRsLmRvbWFpbikgPj0gMCkge1xuICAgICAgICBkZWJ1Z2xvZyhcIioqKioqKioqKioqaGVyZSBtZGxcIiArIEpTT04uc3RyaW5naWZ5KG9NZGwsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RvbWFpbiAnICsgb01kbC5kb21haW4gKyAnIGFscmVhZHkgbG9hZGVkIHdoaWxlIGxvYWRpbmcgJyArIHNNb2RlbE5hbWUgKyAnPycpO1xuICAgIH1cbiAgICAvLyBjaGVjayBwcm9wZXJ0aWVzIG9mIG1vZGVsXG4gICAgT2JqZWN0LmtleXMob01kbCkuc29ydCgpLmZvckVhY2goZnVuY3Rpb24gKHNQcm9wZXJ0eSkge1xuICAgICAgICBpZiAoQVJSX01PREVMX1BST1BFUlRJRVMuaW5kZXhPZihzUHJvcGVydHkpIDwgMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2RlbCBwcm9wZXJ0eSBcIicgKyBzUHJvcGVydHkgKyAnXCIgbm90IGEga25vd24gbW9kZWwgcHJvcGVydHkgaW4gbW9kZWwgb2YgZG9tYWluICcgKyBvTWRsLmRvbWFpbiArICcgJyk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBjb25zaWRlciBzdHJlYW1saW5pbmcgdGhlIGNhdGVnb3JpZXNcbiAgICBvTW9kZWwucmF3TW9kZWxzW29NZGwuZG9tYWluXSA9IG9NZGw7XG4gICAgb01vZGVsLmZ1bGwuZG9tYWluW29NZGwuZG9tYWluXSA9IHtcbiAgICAgICAgZGVzY3JpcHRpb246IG9NZGwuZGVzY3JpcHRpb24sXG4gICAgICAgIGNhdGVnb3JpZXM6IGNhdGVnb3J5RGVzY3JpYmVkTWFwLFxuICAgICAgICBiaXRpbmRleDogb01kbC5iaXRpbmRleFxuICAgIH07XG4gICAgLy8gY2hlY2sgdGhhdFxuICAgIC8vIGNoZWNrIHRoYXQgbWVtYmVycyBvZiB3b3JkaW5kZXggYXJlIGluIGNhdGVnb3JpZXMsXG4gICAgb01kbC53b3JkaW5kZXggPSBvTWRsLndvcmRpbmRleCB8fCBbXTtcbiAgICBvTWRsLndvcmRpbmRleC5mb3JFYWNoKGZ1bmN0aW9uIChzV29yZEluZGV4KSB7XG4gICAgICAgIGlmIChvTWRsLmNhdGVnb3J5LmluZGV4T2Yoc1dvcmRJbmRleCkgPCAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZGVsIHdvcmRpbmRleCBcIicgKyBzV29yZEluZGV4ICsgJ1wiIG5vdCBhIGNhdGVnb3J5IG9mIGRvbWFpbiAnICsgb01kbC5kb21haW4gKyAnICcpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgb01kbC5leGFjdG1hdGNoID0gb01kbC5leGFjdG1hdGNoIHx8IFtdO1xuICAgIG9NZGwuZXhhY3RtYXRjaC5mb3JFYWNoKGZ1bmN0aW9uIChzRXhhY3RNYXRjaCkge1xuICAgICAgICBpZiAob01kbC5jYXRlZ29yeS5pbmRleE9mKHNFeGFjdE1hdGNoKSA8IDApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTW9kZWwgZXhhY3RtYXRjaCBcIicgKyBzRXhhY3RNYXRjaCArICdcIiBub3QgYSBjYXRlZ29yeSBvZiBkb21haW4gJyArIG9NZGwuZG9tYWluICsgJyAnKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIG9NZGwuY29sdW1ucyA9IG9NZGwuY29sdW1ucyB8fCBbXTtcbiAgICBvTWRsLmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoc0V4YWN0TWF0Y2gpIHtcbiAgICAgICAgaWYgKG9NZGwuY2F0ZWdvcnkuaW5kZXhPZihzRXhhY3RNYXRjaCkgPCAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZGVsIGNvbHVtbiBcIicgKyBzRXhhY3RNYXRjaCArICdcIiBub3QgYSBjYXRlZ29yeSBvZiBkb21haW4gJyArIG9NZGwuZG9tYWluICsgJyAnKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIC8vIGFkZCByZWxhdGlvbiBkb21haW4gLT4gY2F0ZWdvcnlcbiAgICB2YXIgZG9tYWluU3RyID0gTWV0YUYuRG9tYWluKG9NZGwuZG9tYWluKS50b0Z1bGxTdHJpbmcoKTtcbiAgICB2YXIgcmVsYXRpb25TdHIgPSBNZXRhRi5SZWxhdGlvbihNZXRhLlJFTEFUSU9OX2hhc0NhdGVnb3J5KS50b0Z1bGxTdHJpbmcoKTtcbiAgICB2YXIgcmV2ZXJzZVJlbGF0aW9uU3RyID0gTWV0YUYuUmVsYXRpb24oTWV0YS5SRUxBVElPTl9pc0NhdGVnb3J5T2YpLnRvRnVsbFN0cmluZygpO1xuICAgIG9NZGwuY2F0ZWdvcnkuZm9yRWFjaChmdW5jdGlvbiAoc0NhdGVnb3J5KSB7XG4gICAgICAgIHZhciBDYXRlZ29yeVN0cmluZyA9IE1ldGFGLkNhdGVnb3J5KHNDYXRlZ29yeSkudG9GdWxsU3RyaW5nKCk7XG4gICAgICAgIG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl0gPSBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdIHx8IHt9O1xuICAgICAgICBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdW3JlbGF0aW9uU3RyXSA9IG9Nb2RlbC5tZXRhLnQzW2RvbWFpblN0cl1bcmVsYXRpb25TdHJdIHx8IHt9O1xuICAgICAgICBvTW9kZWwubWV0YS50M1tkb21haW5TdHJdW3JlbGF0aW9uU3RyXVtDYXRlZ29yeVN0cmluZ10gPSB7fTtcbiAgICAgICAgb01vZGVsLm1ldGEudDNbQ2F0ZWdvcnlTdHJpbmddID0gb01vZGVsLm1ldGEudDNbQ2F0ZWdvcnlTdHJpbmddIHx8IHt9O1xuICAgICAgICBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ11bcmV2ZXJzZVJlbGF0aW9uU3RyXSA9IG9Nb2RlbC5tZXRhLnQzW0NhdGVnb3J5U3RyaW5nXVtyZXZlcnNlUmVsYXRpb25TdHJdIHx8IHt9O1xuICAgICAgICBvTW9kZWwubWV0YS50M1tDYXRlZ29yeVN0cmluZ11bcmV2ZXJzZVJlbGF0aW9uU3RyXVtkb21haW5TdHJdID0ge307XG4gICAgfSk7XG4gICAgLy8gYWRkIGEgcHJlY2ljZSBkb21haW4gbWF0Y2hydWxlXG4gICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XG4gICAgICAgIGNhdGVnb3J5OiBcImRvbWFpblwiLFxuICAgICAgICBtYXRjaGVkU3RyaW5nOiBvTWRsLmRvbWFpbixcbiAgICAgICAgdHlwZTogMCAvKiBXT1JEICovLFxuICAgICAgICB3b3JkOiBvTWRsLmRvbWFpbixcbiAgICAgICAgYml0aW5kZXg6IG9NZGwuYml0aW5kZXgsXG4gICAgICAgIF9yYW5raW5nOiAwLjk1XG4gICAgfSwgb01vZGVsLnNlZW5SdWxlcyk7XG4gICAgLy8gY2hlY2sgdGhlIHRvb2xcbiAgICBpZiAob01kbC50b29sICYmIG9NZGwudG9vbC5yZXF1aXJlcykge1xuICAgICAgICB2YXIgcmVxdWlyZXMgPSBPYmplY3Qua2V5cyhvTWRsLnRvb2wucmVxdWlyZXMgfHwge30pO1xuICAgICAgICB2YXIgZGlmZiA9IF8uZGlmZmVyZW5jZShyZXF1aXJlcywgb01kbC5jYXRlZ29yeSk7XG4gICAgICAgIGlmIChkaWZmLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiIFwiICsgb01kbC5kb21haW4gKyBcIiA6IFVua293biBjYXRlZ29yeSBpbiByZXF1aXJlcyBvZiB0b29sOiBcXFwiXCIgKyBkaWZmLmpvaW4oJ1wiJykgKyAnXCInKTtcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG9wdGlvbmFsID0gT2JqZWN0LmtleXMob01kbC50b29sLm9wdGlvbmFsKTtcbiAgICAgICAgZGlmZiA9IF8uZGlmZmVyZW5jZShvcHRpb25hbCwgb01kbC5jYXRlZ29yeSk7XG4gICAgICAgIGlmIChkaWZmLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiIFwiICsgb01kbC5kb21haW4gKyBcIiA6IFVua293biBjYXRlZ29yeSBvcHRpb25hbCBvZiB0b29sOiBcXFwiXCIgKyBkaWZmLmpvaW4oJ1wiJykgKyAnXCInKTtcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XG4gICAgICAgIH1cbiAgICAgICAgT2JqZWN0LmtleXMob01kbC50b29sLnNldHMgfHwge30pLmZvckVhY2goZnVuY3Rpb24gKHNldElEKSB7XG4gICAgICAgICAgICB2YXIgZGlmZiA9IF8uZGlmZmVyZW5jZShvTWRsLnRvb2wuc2V0c1tzZXRJRF0uc2V0LCBvTWRsLmNhdGVnb3J5KTtcbiAgICAgICAgICAgIGlmIChkaWZmLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIiBcIiArIG9NZGwuZG9tYWluICsgXCIgOiBVbmtvd24gY2F0ZWdvcnkgaW4gc2V0SWQgXCIgKyBzZXRJRCArIFwiIG9mIHRvb2w6IFxcXCJcIiArIGRpZmYuam9pbignXCInKSArICdcIicpO1xuICAgICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgtMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBleHRyYWN0IHRvb2xzIGFuIGFkZCB0byB0b29sczpcbiAgICAgICAgb01vZGVsLnRvb2xzLmZpbHRlcihmdW5jdGlvbiAob0VudHJ5KSB7XG4gICAgICAgICAgICBpZiAob0VudHJ5Lm5hbWUgPT09IChvTWRsLnRvb2wgJiYgb01kbC50b29sLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJUb29sIFwiICsgb01kbC50b29sLm5hbWUgKyBcIiBhbHJlYWR5IHByZXNlbnQgd2hlbiBsb2FkaW5nIFwiICsgc01vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgLy90aHJvdyBuZXcgRXJyb3IoJ0RvbWFpbiBhbHJlYWR5IGxvYWRlZD8nKTtcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoLTEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIG9NZGwudG9vbGhpZGRlbiA9IHRydWU7XG4gICAgICAgIG9NZGwudG9vbC5yZXF1aXJlcyA9IHsgXCJpbXBvc3NpYmxlXCI6IHt9IH07XG4gICAgfVxuICAgIC8vIGFkZCB0aGUgdG9vbCBuYW1lIGFzIHJ1bGUgdW5sZXNzIGhpZGRlblxuICAgIGlmICghb01kbC50b29saGlkZGVuICYmIG9NZGwudG9vbCAmJiBvTWRsLnRvb2wubmFtZSkge1xuICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcInRvb2xcIixcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9NZGwudG9vbC5uYW1lLFxuICAgICAgICAgICAgdHlwZTogMCAvKiBXT1JEICovLFxuICAgICAgICAgICAgd29yZDogb01kbC50b29sLm5hbWUsXG4gICAgICAgICAgICBiaXRpbmRleDogb01kbC5iaXRpbmRleCxcbiAgICAgICAgICAgIF9yYW5raW5nOiAwLjk1XG4gICAgICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xuICAgIH1cbiAgICA7XG4gICAgaWYgKG9NZGwuc3lub255bXMgJiYgb01kbC5zeW5vbnltc1tcInRvb2xcIl0pIHtcbiAgICAgICAgYWRkU3lub255bXMob01kbC5zeW5vbnltc1tcInRvb2xcIl0sIFwidG9vbFwiLCBvTWRsLnRvb2wubmFtZSwgb01kbC5iaXRpbmRleCwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XG4gICAgfVxuICAgIDtcbiAgICBpZiAob01kbC5zeW5vbnltcykge1xuICAgICAgICBPYmplY3Qua2V5cyhvTWRsLnN5bm9ueW1zKS5mb3JFYWNoKGZ1bmN0aW9uIChzc3lua2V5KSB7XG4gICAgICAgICAgICBpZiAob01kbC5jYXRlZ29yeS5pbmRleE9mKHNzeW5rZXkpID49IDAgJiYgc3N5bmtleSAhPT0gXCJ0b29sXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAob01vZGVsLmZ1bGwuZG9tYWluW29NZGwuZG9tYWluXS5jYXRlZ29yaWVzW3NzeW5rZXldKSB7XG4gICAgICAgICAgICAgICAgICAgIG9Nb2RlbC5mdWxsLmRvbWFpbltvTWRsLmRvbWFpbl0uY2F0ZWdvcmllc1tzc3lua2V5XS5zeW5vbnltcyA9IG9NZGwuc3lub255bXNbc3N5bmtleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFkZFN5bm9ueW1zKG9NZGwuc3lub255bXNbc3N5bmtleV0sIFwiY2F0ZWdvcnlcIiwgc3N5bmtleSwgb01kbC5iaXRpbmRleCwgb01vZGVsLm1SdWxlcywgb01vZGVsLnNlZW5SdWxlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBvTW9kZWwuZG9tYWlucy5wdXNoKG9NZGwuZG9tYWluKTtcbiAgICBpZiAob01kbC50b29sLm5hbWUpIHtcbiAgICAgICAgb01vZGVsLnRvb2xzLnB1c2gob01kbC50b29sKTtcbiAgICB9XG4gICAgb01vZGVsLmNhdGVnb3J5ID0gb01vZGVsLmNhdGVnb3J5LmNvbmNhdChvTWRsLmNhdGVnb3J5KTtcbiAgICBvTW9kZWwuY2F0ZWdvcnkuc29ydCgpO1xuICAgIG9Nb2RlbC5jYXRlZ29yeSA9IG9Nb2RlbC5jYXRlZ29yeS5maWx0ZXIoZnVuY3Rpb24gKHN0cmluZywgaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIG9Nb2RlbC5jYXRlZ29yeVtpbmRleF0gIT09IG9Nb2RlbC5jYXRlZ29yeVtpbmRleCArIDFdO1xuICAgIH0pO1xufSAvLyBsb2FkbW9kZWxcbmZ1bmN0aW9uIHNwbGl0UnVsZXMocnVsZXMpIHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgdmFyIG5vbldvcmRSdWxlcyA9IFtdO1xuICAgIHJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKHJ1bGUpIHtcbiAgICAgICAgaWYgKHJ1bGUudHlwZSA9PT0gMCAvKiBXT1JEICovKSB7XG4gICAgICAgICAgICBpZiAoIXJ1bGUubG93ZXJjYXNld29yZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlJ1bGUgaGFzIG5vIG1lbWJlciBsb3dlcmNhc2V3b3JkXCIgKyBKU09OLnN0cmluZ2lmeShydWxlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNbcnVsZS5sb3dlcmNhc2V3b3JkXSA9IHJlc1tydWxlLmxvd2VyY2FzZXdvcmRdIHx8IHsgYml0aW5kZXg6IDAsIHJ1bGVzOiBbXSB9O1xuICAgICAgICAgICAgcmVzW3J1bGUubG93ZXJjYXNld29yZF0uYml0aW5kZXggPSByZXNbcnVsZS5sb3dlcmNhc2V3b3JkXS5iaXRpbmRleCB8IHJ1bGUuYml0aW5kZXg7XG4gICAgICAgICAgICByZXNbcnVsZS5sb3dlcmNhc2V3b3JkXS5ydWxlcy5wdXNoKHJ1bGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbm9uV29yZFJ1bGVzLnB1c2gocnVsZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgICB3b3JkTWFwOiByZXMsXG4gICAgICAgIG5vbldvcmRSdWxlczogbm9uV29yZFJ1bGVzLFxuICAgICAgICBhbGxSdWxlczogcnVsZXMsXG4gICAgICAgIHdvcmRDYWNoZToge31cbiAgICB9O1xufVxuZXhwb3J0cy5zcGxpdFJ1bGVzID0gc3BsaXRSdWxlcztcbmZ1bmN0aW9uIGNtcExlbmd0aFNvcnQoYSwgYikge1xuICAgIHZhciBkID0gYS5sZW5ndGggLSBiLmxlbmd0aDtcbiAgICBpZiAoZCkge1xuICAgICAgICByZXR1cm4gZDtcbiAgICB9XG4gICAgcmV0dXJuIGEubG9jYWxlQ29tcGFyZShiKTtcbn1cbnZhciBEaXN0YW5jZSA9IHJlcXVpcmUoXCIuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW5cIik7XG52YXIgQWxnb2wgPSByZXF1aXJlKFwiLi4vbWF0Y2gvYWxnb2xcIik7XG4vLyBvZmZzZXRbMF0gOiBsZW4tMlxuLy8gICAgICAgICAgICAgbGVuIC0xXG4vLyAgICAgICAgICAgICBsZW5cbi8vICAgICAgICAgICAgIGxlbiArMVxuLy8gICAgICAgICAgICAgbGVuICsyXG4vLyAgICAgICAgICAgICBsZW4gKzNcbmZ1bmN0aW9uIGZpbmROZXh0TGVuKHRhcmdldExlbiwgYXJyLCBvZmZzZXRzKSB7XG4gICAgb2Zmc2V0cy5zaGlmdCgpO1xuICAgIGZvciAodmFyIGkgPSBvZmZzZXRzWzRdOyAoaSA8IGFyci5sZW5ndGgpICYmIChhcnJbaV0ubGVuZ3RoIDw9IHRhcmdldExlbik7ICsraSkge1xuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKFwicHVzaGluZyBcIiArIGkpO1xuICAgIG9mZnNldHMucHVzaChpKTtcbn1cbmV4cG9ydHMuZmluZE5leHRMZW4gPSBmaW5kTmV4dExlbjtcbmZ1bmN0aW9uIGFkZFJhbmdlUnVsZXNVbmxlc3NQcmVzZW50KHJ1bGVzLCBsY3dvcmQsIHJhbmdlUnVsZXMsIHByZXNlbnRSdWxlc0ZvcktleSwgc2VlblJ1bGVzKSB7XG4gICAgcmFuZ2VSdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChyYW5nZVJ1bGUpIHtcbiAgICAgICAgdmFyIG5ld1J1bGUgPSBPYmplY3QuYXNzaWduKHt9LCByYW5nZVJ1bGUpO1xuICAgICAgICBuZXdSdWxlLmxvd2VyY2FzZXdvcmQgPSBsY3dvcmQ7XG4gICAgICAgIG5ld1J1bGUud29yZCA9IGxjd29yZDtcbiAgICAgICAgLy9pZigobGN3b3JkID09PSAnc2VydmljZXMnIHx8IGxjd29yZCA9PT0gJ3NlcnZpY2UnKSAmJiBuZXdSdWxlLnJhbmdlLnJ1bGUubG93ZXJjYXNld29yZC5pbmRleE9mKCdvZGF0YScpPj0wKSB7XG4gICAgICAgIC8vICAgIGNvbnNvbGUubG9nKFwiYWRkaW5nIFwiKyBKU09OLnN0cmluZ2lmeShuZXdSdWxlKSArIFwiXFxuXCIpO1xuICAgICAgICAvL31cbiAgICAgICAgLy90b2RvOiBjaGVjayB3aGV0aGVyIGFuIGVxdWl2YWxlbnQgcnVsZSBpcyBhbHJlYWR5IHByZXNlbnQ/XG4gICAgICAgIHZhciBjbnQgPSBydWxlcy5sZW5ndGg7XG4gICAgICAgIGluc2VydFJ1bGVJZk5vdFByZXNlbnQocnVsZXMsIG5ld1J1bGUsIHNlZW5SdWxlcyk7XG4gICAgfSk7XG59XG5leHBvcnRzLmFkZFJhbmdlUnVsZXNVbmxlc3NQcmVzZW50ID0gYWRkUmFuZ2VSdWxlc1VubGVzc1ByZXNlbnQ7XG5mdW5jdGlvbiBhZGRDbG9zZUV4YWN0UmFuZ2VSdWxlcyhydWxlcywgc2VlblJ1bGVzKSB7XG4gICAgdmFyIGtleXNNYXAgPSB7fTtcbiAgICB2YXIgcmFuZ2VLZXlzTWFwID0ge307XG4gICAgcnVsZXMuZm9yRWFjaChmdW5jdGlvbiAocnVsZSkge1xuICAgICAgICBpZiAocnVsZS50eXBlID09PSAwIC8qIFdPUkQgKi8pIHtcbiAgICAgICAgICAgIC8va2V5c01hcFtydWxlLmxvd2VyY2FzZXdvcmRdID0gMTtcbiAgICAgICAgICAgIGtleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXSA9IGtleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXSB8fCBbXTtcbiAgICAgICAgICAgIGtleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXS5wdXNoKHJ1bGUpO1xuICAgICAgICAgICAgaWYgKCFydWxlLmV4YWN0T25seSAmJiBydWxlLnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgcmFuZ2VLZXlzTWFwW3J1bGUubG93ZXJjYXNld29yZF0gPSByYW5nZUtleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXSB8fCBbXTtcbiAgICAgICAgICAgICAgICByYW5nZUtleXNNYXBbcnVsZS5sb3dlcmNhc2V3b3JkXS5wdXNoKHJ1bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhrZXlzTWFwKTtcbiAgICBrZXlzLnNvcnQoY21wTGVuZ3RoU29ydCk7XG4gICAgdmFyIGxlbiA9IDA7XG4gICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXksIGluZGV4KSB7XG4gICAgICAgIGlmIChrZXkubGVuZ3RoICE9IGxlbikge1xuICAgICAgICB9XG4gICAgICAgIGxlbiA9IGtleS5sZW5ndGg7XG4gICAgfSk7XG4gICAgLy8gICBrZXlzID0ga2V5cy5zbGljZSgwLDIwMDApO1xuICAgIHZhciByYW5nZUtleXMgPSBPYmplY3Qua2V5cyhyYW5nZUtleXNNYXApO1xuICAgIHJhbmdlS2V5cy5zb3J0KGNtcExlbmd0aFNvcnQpO1xuICAgIC8vY29uc29sZS5sb2coYCAke2tleXMubGVuZ3RofSBrZXlzIGFuZCAke3JhbmdlS2V5cy5sZW5ndGh9IHJhbmdla2V5cyBgKTtcbiAgICB2YXIgbG93ID0gMDtcbiAgICB2YXIgaGlnaCA9IDA7XG4gICAgdmFyIGxhc3RsZW4gPSAwO1xuICAgIHZhciBvZmZzZXRzID0gWzAsIDAsIDAsIDAsIDAsIDBdO1xuICAgIHZhciBsZW4gPSByYW5nZUtleXMubGVuZ3RoO1xuICAgIGZpbmROZXh0TGVuKDAsIGtleXMsIG9mZnNldHMpO1xuICAgIGZpbmROZXh0TGVuKDEsIGtleXMsIG9mZnNldHMpO1xuICAgIGZpbmROZXh0TGVuKDIsIGtleXMsIG9mZnNldHMpO1xuICAgIHJhbmdlS2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChyYW5nZUtleSkge1xuICAgICAgICBpZiAocmFuZ2VLZXkubGVuZ3RoICE9PSBsYXN0bGVuKSB7XG4gICAgICAgICAgICBmb3IgKGkgPSBsYXN0bGVuICsgMTsgaSA8PSByYW5nZUtleS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgIGZpbmROZXh0TGVuKGkgKyAyLCBrZXlzLCBvZmZzZXRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgY29uc29sZS5sb2coYCBzaGlmdGVkIHRvICR7cmFuZ2VLZXkubGVuZ3RofSB3aXRoIG9mZnNldHMgYmVlaW5nICR7b2Zmc2V0cy5qb2luKCcgJyl9YCk7XG4gICAgICAgICAgICAvLyAgIGNvbnNvbGUubG9nKGAgaGVyZSAwICR7b2Zmc2V0c1swXX0gOiAke2tleXNbTWF0aC5taW4oa2V5cy5sZW5ndGgtMSwgb2Zmc2V0c1swXSldLmxlbmd0aH0gICR7a2V5c1tNYXRoLm1pbihrZXlzLmxlbmd0aC0xLCBvZmZzZXRzWzBdKV19IGApO1xuICAgICAgICAgICAgLy8gIGNvbnNvbGUubG9nKGAgaGVyZSA1LTEgICR7a2V5c1tvZmZzZXRzWzVdLTFdLmxlbmd0aH0gICR7a2V5c1tvZmZzZXRzWzVdLTFdfSBgKTtcbiAgICAgICAgICAgIC8vICAgY29uc29sZS5sb2coYCBoZXJlIDUgJHtvZmZzZXRzWzVdfSA6ICR7a2V5c1tNYXRoLm1pbihrZXlzLmxlbmd0aC0xLCBvZmZzZXRzWzVdKV0ubGVuZ3RofSAgJHtrZXlzW01hdGgubWluKGtleXMubGVuZ3RoLTEsIG9mZnNldHNbNV0pXX0gYCk7XG4gICAgICAgICAgICBsYXN0bGVuID0gcmFuZ2VLZXkubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSBvZmZzZXRzWzBdOyBpIDwgb2Zmc2V0c1s1XTsgKytpKSB7XG4gICAgICAgICAgICB2YXIgZCA9IERpc3RhbmNlLmNhbGNEaXN0YW5jZUFkanVzdGVkKHJhbmdlS2V5LCBrZXlzW2ldKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGAke3JhbmdlS2V5Lmxlbmd0aC1rZXlzW2ldLmxlbmd0aH0gJHtkfSAke3JhbmdlS2V5fSBhbmQgJHtrZXlzW2ldfSAgYCk7XG4gICAgICAgICAgICBpZiAoKGQgIT09IDEuMCkgJiYgKGQgPj0gQWxnb2wuQ3V0b2ZmX3JhbmdlQ2xvc2VNYXRjaCkpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGB3b3VsZCBhZGQgJHtyYW5nZUtleX0gZm9yICR7a2V5c1tpXX0gJHtkfWApO1xuICAgICAgICAgICAgICAgIHZhciBjbnQgPSBydWxlcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgLy8gd2Ugb25seSBoYXZlIHRvIGFkZCBpZiB0aGVyZSBpcyBub3QgeWV0IGEgbWF0Y2ggcnVsZSBoZXJlIHdoaWNoIHBvaW50cyB0byB0aGUgc2FtZVxuICAgICAgICAgICAgICAgIGFkZFJhbmdlUnVsZXNVbmxlc3NQcmVzZW50KHJ1bGVzLCBrZXlzW2ldLCByYW5nZUtleXNNYXBbcmFuZ2VLZXldLCBrZXlzTWFwW2tleXNbaV1dLCBzZWVuUnVsZXMpO1xuICAgICAgICAgICAgICAgIGlmIChydWxlcy5sZW5ndGggPiBjbnQpIHtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICAvKlxuICAgIFtcbiAgICAgICAgWydhRUZHJywnYUVGR0gnXSxcbiAgICAgICAgWydhRUZHSCcsJ2FFRkdISSddLFxuICAgICAgICBbJ09kYXRhJywnT0RhdGFzJ10sXG4gICBbJ09kYXRhJywnT2RhdGFzJ10sXG4gICBbJ09kYXRhJywnT2RhdGInXSxcbiAgIFsnT2RhdGEnLCdVRGF0YSddLFxuICAgWydzZXJ2aWNlJywnc2VydmljZXMnXSxcbiAgIFsndGhpcyBpc2Z1bm55IGFuZCBtb3JlJywndGhpcyBpc2Z1bm55IGFuZCBtb3JlcyddLFxuICAgIF0uZm9yRWFjaChyZWMgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhgZGlzdGFuY2UgJHtyZWNbMF19ICR7cmVjWzFdfSA6ICR7RGlzdGFuY2UuY2FsY0Rpc3RhbmNlKHJlY1swXSxyZWNbMV0pfSAgYWRmICR7RGlzdGFuY2UuY2FsY0Rpc3RhbmNlQWRqdXN0ZWQocmVjWzBdLHJlY1sxXSl9IGApO1xuXG4gICAgfSk7XG4gICAgY29uc29sZS5sb2coXCJkaXN0YW5jZSBPZGF0YSBVZGF0YVwiKyBEaXN0YW5jZS5jYWxjRGlzdGFuY2UoJ09EYXRhJywnVURhdGEnKSk7XG4gICAgY29uc29sZS5sb2coXCJkaXN0YW5jZSBPZGF0YSBPZGF0YlwiKyBEaXN0YW5jZS5jYWxjRGlzdGFuY2UoJ09EYXRhJywnT0RhdGInKSk7XG4gICAgY29uc29sZS5sb2coXCJkaXN0YW5jZSBPZGF0YXMgT2RhdGFcIisgRGlzdGFuY2UuY2FsY0Rpc3RhbmNlKCdPRGF0YScsJ09EYXRhYScpKTtcbiAgICBjb25zb2xlLmxvZyhcImRpc3RhbmNlIE9kYXRhcyBhYmNkZVwiKyBEaXN0YW5jZS5jYWxjRGlzdGFuY2UoJ2FiY2RlJywnYWJjZGVmJykpO1xuICAgIGNvbnNvbGUubG9nKFwiZGlzdGFuY2Ugc2VydmljZXMgXCIrIERpc3RhbmNlLmNhbGNEaXN0YW5jZSgnc2VydmljZXMnLCdzZXJ2aWNlJykpO1xuICAgICovXG59XG5leHBvcnRzLmFkZENsb3NlRXhhY3RSYW5nZVJ1bGVzID0gYWRkQ2xvc2VFeGFjdFJhbmdlUnVsZXM7XG52YXIgbiA9IDA7XG5mdW5jdGlvbiBsb2FkTW9kZWxzKG1vZGVsUGF0aCkge1xuICAgIHZhciBvTW9kZWw7XG4gICAgb01vZGVsID0ge1xuICAgICAgICBmdWxsOiB7IGRvbWFpbjoge30gfSxcbiAgICAgICAgcmF3TW9kZWxzOiB7fSxcbiAgICAgICAgZG9tYWluczogW10sXG4gICAgICAgIHRvb2xzOiBbXSxcbiAgICAgICAgcnVsZXM6IHVuZGVmaW5lZCxcbiAgICAgICAgY2F0ZWdvcnk6IFtdLFxuICAgICAgICBvcGVyYXRvcnM6IHt9LFxuICAgICAgICBtUnVsZXM6IFtdLFxuICAgICAgICBzZWVuUnVsZXM6IHt9LFxuICAgICAgICByZWNvcmRzOiBbXSxcbiAgICAgICAgbWV0YTogeyB0Mzoge30gfVxuICAgIH07XG4gICAgdmFyIHQgPSBEYXRlLm5vdygpO1xuICAgIG1vZGVsUGF0aCA9IG1vZGVsUGF0aCB8fCBlbnZNb2RlbFBhdGg7XG4gICAgdHJ5IHtcbiAgICAgICAgdmFyIGEgPSBDaXJjdWxhclNlci5sb2FkKCcuLycgKyBtb2RlbFBhdGggKyAnL19jYWNoZWZhbHNlLmpzJyk7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJmb3VuZCBhIGNhY2hlID8gIFwiICsgISFhKTtcbiAgICAgICAgLy9hID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoYSkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIgcmV0dXJuIHByZXBhcmVzZSBtb2RlbCBcIik7XG4gICAgICAgICAgICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9FTUFJTF9VU0VSKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJsb2FkZWQgbW9kZWxzIGZyb20gY2FjaGUgaW4gXCIgKyAoRGF0ZS5ub3coKSAtIHQpICsgXCIgXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICB9XG4gICAgdmFyIG1kbHMgPSByZWFkRmlsZUFzSlNPTignLi8nICsgbW9kZWxQYXRoICsgJy9tb2RlbHMuanNvbicpO1xuICAgIG1kbHMuZm9yRWFjaChmdW5jdGlvbiAoc01vZGVsTmFtZSkge1xuICAgICAgICBsb2FkTW9kZWwobW9kZWxQYXRoLCBzTW9kZWxOYW1lLCBvTW9kZWwpO1xuICAgIH0pO1xuICAgIC8vIGFkZCB0aGUgY2F0ZWdvcmllcyB0byB0aGUgbW9kZWw6XG4gICAgLypcbiAgICBvTW9kZWwuY2F0ZWdvcnkuZm9yRWFjaChmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogXCJjYXRlZ29yeVwiLFxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogY2F0ZWdvcnksXG4gICAgICAgICAgICB0eXBlOiBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQsXG4gICAgICAgICAgICB3b3JkOiBjYXRlZ29yeSxcbiAgICAgICAgICAgIGxvd2VyY2FzZXdvcmQ6IGNhdGVnb3J5LnRvTG93ZXJDYXNlKCksXG4gICAgICAgICAgICBiaXRpbmRleCA6IG9NZGwuXG4gICAgICAgICAgICBfcmFua2luZzogMC45NVxuICAgICAgICB9LCBvTW9kZWwuc2VlblJ1bGVzKTtcbiAgICB9KTtcbiAgICAqL1xuICAgIHZhciBtZXRhQml0SW5kZXggPSBnZXREb21haW5CaXRJbmRleCgnbWV0YScsIG9Nb2RlbCk7XG4gICAgLy8gYWRkIHRoZSBkb21haW4gbWV0YSBydWxlXG4gICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XG4gICAgICAgIGNhdGVnb3J5OiBcIm1ldGFcIixcbiAgICAgICAgbWF0Y2hlZFN0cmluZzogXCJkb21haW5cIixcbiAgICAgICAgdHlwZTogMCAvKiBXT1JEICovLFxuICAgICAgICB3b3JkOiBcImRvbWFpblwiLFxuICAgICAgICBiaXRpbmRleDogbWV0YUJpdEluZGV4LFxuICAgICAgICBfcmFua2luZzogMC45NVxuICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xuICAgIHZhciBmaWxsZXJCaXRJbmRleCA9IGdldERvbWFpbkJpdEluZGV4KCdtZXRhJywgb01vZGVsKTtcbiAgICAvL2FkZCBhIGZpbGxlciBydWxlXG4gICAgdmFyIGZpbGxlcnMgPSByZWFkRmlsZUFzSlNPTignLi8nICsgbW9kZWxQYXRoICsgJy9maWxsZXIuanNvbicpO1xuICAgIHZhciByZSA9IFwiXigoXCIgKyBmaWxsZXJzLmpvaW4oXCIpfChcIikgKyBcIikpJFwiO1xuICAgIG9Nb2RlbC5tUnVsZXMucHVzaCh7XG4gICAgICAgIGNhdGVnb3J5OiBcImZpbGxlclwiLFxuICAgICAgICB0eXBlOiAxIC8qIFJFR0VYUCAqLyxcbiAgICAgICAgcmVnZXhwOiBuZXcgUmVnRXhwKHJlLCBcImlcIiksXG4gICAgICAgIG1hdGNoZWRTdHJpbmc6IFwiZmlsbGVyXCIsXG4gICAgICAgIGJpdGluZGV4OiBmaWxsZXJCaXRJbmRleCxcbiAgICAgICAgX3Jhbmtpbmc6IDAuOVxuICAgIH0pO1xuICAgIC8vYWRkIG9wZXJhdG9yc1xuICAgIHZhciBvcGVyYXRvcnMgPSByZWFkRmlsZUFzSlNPTignLi9yZXNvdXJjZXMvbW9kZWwvb3BlcmF0b3JzLmpzb24nKTtcbiAgICB2YXIgb3BlcmF0b3JCaXRJbmRleCA9IGdldERvbWFpbkJpdEluZGV4KCdvcGVyYXRvcnMnLCBvTW9kZWwpO1xuICAgIE9iamVjdC5rZXlzKG9wZXJhdG9ycy5vcGVyYXRvcnMpLmZvckVhY2goZnVuY3Rpb24gKG9wZXJhdG9yKSB7XG4gICAgICAgIGlmIChJTWF0Y2guYU9wZXJhdG9yTmFtZXMuaW5kZXhPZihvcGVyYXRvcikgPCAwKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcInVua25vd24gb3BlcmF0b3IgXCIgKyBvcGVyYXRvcik7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIG9wZXJhdG9yIFwiICsgb3BlcmF0b3IpO1xuICAgICAgICB9XG4gICAgICAgIG9Nb2RlbC5vcGVyYXRvcnNbb3BlcmF0b3JdID0gb3BlcmF0b3JzLm9wZXJhdG9yc1tvcGVyYXRvcl07XG4gICAgICAgIG9Nb2RlbC5vcGVyYXRvcnNbb3BlcmF0b3JdLm9wZXJhdG9yID0gb3BlcmF0b3I7XG4gICAgICAgIE9iamVjdC5mcmVlemUob01vZGVsLm9wZXJhdG9yc1tvcGVyYXRvcl0pO1xuICAgICAgICB2YXIgd29yZCA9IG9wZXJhdG9yO1xuICAgICAgICBpbnNlcnRSdWxlSWZOb3RQcmVzZW50KG9Nb2RlbC5tUnVsZXMsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiBcIm9wZXJhdG9yXCIsXG4gICAgICAgICAgICB3b3JkOiB3b3JkLnRvTG93ZXJDYXNlKCksXG4gICAgICAgICAgICBsb3dlcmNhc2V3b3JkOiB3b3JkLnRvTG93ZXJDYXNlKCksXG4gICAgICAgICAgICB0eXBlOiAwIC8qIFdPUkQgKi8sXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiB3b3JkLFxuICAgICAgICAgICAgYml0aW5kZXg6IG9wZXJhdG9yQml0SW5kZXgsXG4gICAgICAgICAgICBfcmFua2luZzogMC45XG4gICAgICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xuICAgICAgICAvLyBhZGQgYWxsIHN5bm9ueW1zXG4gICAgICAgIGlmIChvcGVyYXRvcnMuc3lub255bXNbb3BlcmF0b3JdKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhvcGVyYXRvcnMuc3lub255bXNbb3BlcmF0b3JdKS5mb3JFYWNoKGZ1bmN0aW9uIChzeW5vbnltKSB7XG4gICAgICAgICAgICAgICAgaW5zZXJ0UnVsZUlmTm90UHJlc2VudChvTW9kZWwubVJ1bGVzLCB7XG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBcIm9wZXJhdG9yXCIsXG4gICAgICAgICAgICAgICAgICAgIHdvcmQ6IHN5bm9ueW0udG9Mb3dlckNhc2UoKSxcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJjYXNld29yZDogc3lub255bS50b0xvd2VyQ2FzZSgpLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAwIC8qIFdPUkQgKi8sXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9wZXJhdG9yLFxuICAgICAgICAgICAgICAgICAgICBiaXRpbmRleDogb3BlcmF0b3JCaXRJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IDAuOVxuICAgICAgICAgICAgICAgIH0sIG9Nb2RlbC5zZWVuUnVsZXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICAvKlxuICAgICAgICB9KVxuICAgICAgICAgICAge1xuICAgICAgICAgIGNhdGVnb3J5OiBcImZpbGxlclwiLFxuICAgICAgICAgIHR5cGU6IDEsXG4gICAgICAgICAgcmVnZXhwOiAvXigoc3RhcnQpfChzaG93KXwoZnJvbSl8KGluKSkkL2ksXG4gICAgICAgICAgbWF0Y2hlZFN0cmluZzogXCJmaWxsZXJcIixcbiAgICAgICAgICBfcmFua2luZzogMC45XG4gICAgICAgIH0sXG4gICAgKi9cbiAgICBvTW9kZWwubVJ1bGVzID0gb01vZGVsLm1SdWxlcy5zb3J0KElucHV0RmlsdGVyUnVsZXMuY21wTVJ1bGUpO1xuICAgIGFkZENsb3NlRXhhY3RSYW5nZVJ1bGVzKG9Nb2RlbC5tUnVsZXMsIG9Nb2RlbC5zZWVuUnVsZXMpO1xuICAgIG9Nb2RlbC5tUnVsZXMgPSBvTW9kZWwubVJ1bGVzLnNvcnQoSW5wdXRGaWx0ZXJSdWxlcy5jbXBNUnVsZSk7XG4gICAgZm9yY2VHQygpO1xuICAgIG9Nb2RlbC5ydWxlcyA9IHNwbGl0UnVsZXMob01vZGVsLm1SdWxlcyk7XG4gICAgZm9yY2VHQygpO1xuICAgIG9Nb2RlbC50b29scyA9IG9Nb2RlbC50b29scy5zb3J0KFRvb2xzLmNtcFRvb2xzKTtcbiAgICBkZWxldGUgb01vZGVsLnNlZW5SdWxlcztcbiAgICBkZWJ1Z2xvZygnc2F2aW5nJyk7XG4gICAgZm9yY2VHQygpO1xuICAgIENpcmN1bGFyU2VyLnNhdmUoJy4vJyArIG1vZGVsUGF0aCArICcvX2NhY2hlZmFsc2UuanMnLCBvTW9kZWwpO1xuICAgIGZvcmNlR0MoKTtcbiAgICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9FTUFJTF9VU0VSKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibG9hZGVkIG1vZGVscyBieSBjYWxjdWxhdGlvbiBpbiBcIiArIChEYXRlLm5vdygpIC0gdCkgKyBcIiBcIik7XG4gICAgfVxuICAgIHJldHVybiBvTW9kZWw7XG59XG5leHBvcnRzLmxvYWRNb2RlbHMgPSBsb2FkTW9kZWxzO1xuZnVuY3Rpb24gc29ydENhdGVnb3JpZXNCeUltcG9ydGFuY2UobWFwLCBjYXRzKSB7XG4gICAgdmFyIHJlcyA9IGNhdHMuc2xpY2UoMCk7XG4gICAgcmVzLnNvcnQocmFua0NhdGVnb3J5QnlJbXBvcnRhbmNlLmJpbmQodW5kZWZpbmVkLCBtYXApKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5zb3J0Q2F0ZWdvcmllc0J5SW1wb3J0YW5jZSA9IHNvcnRDYXRlZ29yaWVzQnlJbXBvcnRhbmNlO1xuZnVuY3Rpb24gcmFua0NhdGVnb3J5QnlJbXBvcnRhbmNlKG1hcCwgY2F0YSwgY2F0Yikge1xuICAgIHZhciBjYXRBRGVzYyA9IG1hcFtjYXRhXTtcbiAgICB2YXIgY2F0QkRlc2MgPSBtYXBbY2F0Yl07XG4gICAgaWYgKGNhdGEgPT09IGNhdGIpIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIC8vIGlmIGEgaXMgYmVmb3JlIGIsIHJldHVybiAtMVxuICAgIGlmIChjYXRBRGVzYyAmJiAhY2F0QkRlc2MpIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbiAgICBpZiAoIWNhdEFEZXNjICYmIGNhdEJEZXNjKSB7XG4gICAgICAgIHJldHVybiArMTtcbiAgICB9XG4gICAgdmFyIHByaW9BID0gKGNhdEFEZXNjICYmIGNhdEFEZXNjLmltcG9ydGFuY2UpIHx8IDk5O1xuICAgIHZhciBwcmlvQiA9IChjYXRCRGVzYyAmJiBjYXRCRGVzYy5pbXBvcnRhbmNlKSB8fCA5OTtcbiAgICAvLyBsb3dlciBwcmlvIGdvZXMgdG8gZnJvbnRcbiAgICB2YXIgciA9IHByaW9BIC0gcHJpb0I7XG4gICAgaWYgKHIpIHtcbiAgICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIHJldHVybiBjYXRhLmxvY2FsZUNvbXBhcmUoY2F0Yik7XG59XG5leHBvcnRzLnJhbmtDYXRlZ29yeUJ5SW1wb3J0YW5jZSA9IHJhbmtDYXRlZ29yeUJ5SW1wb3J0YW5jZTtcbnZhciBNZXRhRiA9IE1ldGEuZ2V0TWV0YUZhY3RvcnkoKTtcbmZ1bmN0aW9uIGdldE9wZXJhdG9yKG1kbCwgb3BlcmF0b3IpIHtcbiAgICByZXR1cm4gbWRsLm9wZXJhdG9yc1tvcGVyYXRvcl07XG59XG5leHBvcnRzLmdldE9wZXJhdG9yID0gZ2V0T3BlcmF0b3I7XG5mdW5jdGlvbiBnZXRSZXN1bHRBc0FycmF5KG1kbCwgYSwgcmVsKSB7XG4gICAgaWYgKHJlbC50b1R5cGUoKSAhPT0gJ3JlbGF0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJleHBlY3QgcmVsYXRpb24gYXMgMm5kIGFyZ1wiKTtcbiAgICB9XG4gICAgdmFyIHJlcyA9IG1kbC5tZXRhLnQzW2EudG9GdWxsU3RyaW5nKCldICYmXG4gICAgICAgIG1kbC5tZXRhLnQzW2EudG9GdWxsU3RyaW5nKCldW3JlbC50b0Z1bGxTdHJpbmcoKV07XG4gICAgaWYgKCFyZXMpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocmVzKS5zb3J0KCkubWFwKE1ldGFGLnBhcnNlSU1ldGEpO1xufVxuZXhwb3J0cy5nZXRSZXN1bHRBc0FycmF5ID0gZ2V0UmVzdWx0QXNBcnJheTtcbmZ1bmN0aW9uIGdldENhdGVnb3JpZXNGb3JEb21haW4odGhlTW9kZWwsIGRvbWFpbikge1xuICAgIGlmICh0aGVNb2RlbC5kb21haW5zLmluZGV4T2YoZG9tYWluKSA8IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG9tYWluIFxcXCJcIiArIGRvbWFpbiArIFwiXFxcIiBub3QgcGFydCBvZiBtb2RlbFwiKTtcbiAgICB9XG4gICAgdmFyIHJlcyA9IGdldFJlc3VsdEFzQXJyYXkodGhlTW9kZWwsIE1ldGFGLkRvbWFpbihkb21haW4pLCBNZXRhRi5SZWxhdGlvbihNZXRhLlJFTEFUSU9OX2hhc0NhdGVnb3J5KSk7XG4gICAgcmV0dXJuIE1ldGEuZ2V0U3RyaW5nQXJyYXkocmVzKTtcbn1cbmV4cG9ydHMuZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbiA9IGdldENhdGVnb3JpZXNGb3JEb21haW47XG5mdW5jdGlvbiBnZXRUYWJsZUNvbHVtbnModGhlTW9kZWwsIGRvbWFpbikge1xuICAgIGlmICh0aGVNb2RlbC5kb21haW5zLmluZGV4T2YoZG9tYWluKSA8IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG9tYWluIFxcXCJcIiArIGRvbWFpbiArIFwiXFxcIiBub3QgcGFydCBvZiBtb2RlbFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoZU1vZGVsLnJhd01vZGVsc1tkb21haW5dLmNvbHVtbnMuc2xpY2UoMCk7XG59XG5leHBvcnRzLmdldFRhYmxlQ29sdW1ucyA9IGdldFRhYmxlQ29sdW1ucztcbmZ1bmN0aW9uIGZvcmNlR0MoKSB7XG4gICAgaWYgKGdsb2JhbCAmJiBnbG9iYWwuZ2MpIHtcbiAgICAgICAgZ2xvYmFsLmdjKCk7XG4gICAgfVxufVxuLyoqXG4gKiBSZXR1cm4gYWxsIGNhdGVnb3JpZXMgb2YgYSBkb21haW4gd2hpY2ggY2FuIGFwcGVhciBvbiBhIHdvcmQsXG4gKiB0aGVzZSBhcmUgdHlwaWNhbGx5IHRoZSB3b3JkaW5kZXggZG9tYWlucyArIGVudHJpZXMgZ2VuZXJhdGVkIGJ5IGdlbmVyaWMgcnVsZXNcbiAqXG4gKiBUaGUgY3VycmVudCBpbXBsZW1lbnRhdGlvbiBpcyBhIHNpbXBsaWZpY2F0aW9uXG4gKi9cbmZ1bmN0aW9uIGdldFBvdGVudGlhbFdvcmRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsLCBkb21haW4pIHtcbiAgICAvLyB0aGlzIGlzIGEgc2ltcGxpZmllZCB2ZXJzaW9uXG4gICAgcmV0dXJuIGdldENhdGVnb3JpZXNGb3JEb21haW4odGhlTW9kZWwsIGRvbWFpbik7XG59XG5leHBvcnRzLmdldFBvdGVudGlhbFdvcmRDYXRlZ29yaWVzRm9yRG9tYWluID0gZ2V0UG90ZW50aWFsV29yZENhdGVnb3JpZXNGb3JEb21haW47XG5mdW5jdGlvbiBnZXREb21haW5zRm9yQ2F0ZWdvcnkodGhlTW9kZWwsIGNhdGVnb3J5KSB7XG4gICAgaWYgKHRoZU1vZGVsLmNhdGVnb3J5LmluZGV4T2YoY2F0ZWdvcnkpIDwgMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYXRlZ29yeSBcXFwiXCIgKyBjYXRlZ29yeSArIFwiXFxcIiBub3QgcGFydCBvZiBtb2RlbFwiKTtcbiAgICB9XG4gICAgdmFyIHJlcyA9IGdldFJlc3VsdEFzQXJyYXkodGhlTW9kZWwsIE1ldGFGLkNhdGVnb3J5KGNhdGVnb3J5KSwgTWV0YUYuUmVsYXRpb24oTWV0YS5SRUxBVElPTl9pc0NhdGVnb3J5T2YpKTtcbiAgICByZXR1cm4gTWV0YS5nZXRTdHJpbmdBcnJheShyZXMpO1xufVxuZXhwb3J0cy5nZXREb21haW5zRm9yQ2F0ZWdvcnkgPSBnZXREb21haW5zRm9yQ2F0ZWdvcnk7XG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yeShtb2RlbDogSU1hdGNoLklNb2RlbHMsIGNhdGVnb3J5OiBzdHJpbmcsIHdvcmRzb25seTogYm9vbGVhbik6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9IHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgLy9cbiAgICB2YXIgZm4gPSB3b3Jkc29ubHkgPyBnZXRQb3RlbnRpYWxXb3JkQ2F0ZWdvcmllc0ZvckRvbWFpbiA6IGdldENhdGVnb3JpZXNGb3JEb21haW47XG4gICAgdmFyIGRvbWFpbnMgPSBnZXREb21haW5zRm9yQ2F0ZWdvcnkobW9kZWwsIGNhdGVnb3J5KTtcbiAgICBkb21haW5zLmZvckVhY2goZnVuY3Rpb24gKGRvbWFpbikge1xuICAgICAgICBmbihtb2RlbCwgZG9tYWluKS5mb3JFYWNoKGZ1bmN0aW9uICh3b3JkY2F0KSB7XG4gICAgICAgICAgICByZXNbd29yZGNhdF0gPSB0cnVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yaWVzKG1vZGVsOiBJTWF0Y2guSU1vZGVscywgY2F0ZWdvcmllczogc3RyaW5nW10sIHdvcmRzb25seTogYm9vbGVhbik6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9IHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgLy9cbiAgICB2YXIgZm4gPSB3b3Jkc29ubHkgPyBnZXRQb3RlbnRpYWxXb3JkQ2F0ZWdvcmllc0ZvckRvbWFpbiA6IGdldENhdGVnb3JpZXNGb3JEb21haW47XG4gICAgdmFyIGRvbWFpbnMgPSB1bmRlZmluZWQ7XG4gICAgY2F0ZWdvcmllcy5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICB2YXIgY2F0ZG9tYWlucyA9IGdldERvbWFpbnNGb3JDYXRlZ29yeShtb2RlbCwgY2F0ZWdvcnkpXG4gICAgICAgIGlmICghZG9tYWlucykge1xuICAgICAgICAgICAgZG9tYWlucyA9IGNhdGRvbWFpbnM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkb21haW5zID0gXy5pbnRlcnNlY3Rpb24oZG9tYWlucywgY2F0ZG9tYWlucyk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoZG9tYWlucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYXRlZ29yaWVzICcgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChjYXRlZ29yaWVzKSArICcgaGF2ZSBubyBjb21tb24gZG9tYWluLicpXG4gICAgfVxuICAgIGRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbiAoZG9tYWluKSB7XG4gICAgICAgIGZuKG1vZGVsLCBkb21haW4pLmZvckVhY2goZnVuY3Rpb24gKHdvcmRjYXQpIHtcbiAgICAgICAgICAgIHJlc1t3b3JkY2F0XSA9IHRydWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICByZXR1cm4gcmVzO1xufVxuKi9cbi8qKlxuICogZ2l2ZW5hICBzZXQgIG9mIGNhdGVnb3JpZXMsIHJldHVybiBhIHN0cnVjdHVyZVxuICpcbiAqXG4gKiB7IGRvbWFpbnMgOiBbXCJET01BSU4xXCIsIFwiRE9NQUlOMlwiXSxcbiAqICAgY2F0ZWdvcnlTZXQgOiB7ICAgY2F0MSA6IHRydWUsIGNhdDIgOiB0cnVlLCAuLi59XG4gKiB9XG4gKi9cbmZ1bmN0aW9uIGdldERvbWFpbkNhdGVnb3J5RmlsdGVyRm9yVGFyZ2V0Q2F0ZWdvcmllcyhtb2RlbCwgY2F0ZWdvcmllcywgd29yZHNvbmx5KSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIC8vXG4gICAgdmFyIGZuID0gd29yZHNvbmx5ID8gZ2V0UG90ZW50aWFsV29yZENhdGVnb3JpZXNGb3JEb21haW4gOiBnZXRDYXRlZ29yaWVzRm9yRG9tYWluO1xuICAgIHZhciBkb21haW5zID0gdW5kZWZpbmVkO1xuICAgIGNhdGVnb3JpZXMuZm9yRWFjaChmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgdmFyIGNhdGRvbWFpbnMgPSBnZXREb21haW5zRm9yQ2F0ZWdvcnkobW9kZWwsIGNhdGVnb3J5KTtcbiAgICAgICAgaWYgKCFkb21haW5zKSB7XG4gICAgICAgICAgICBkb21haW5zID0gY2F0ZG9tYWlucztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRvbWFpbnMgPSBfLmludGVyc2VjdGlvbihkb21haW5zLCBjYXRkb21haW5zKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChkb21haW5zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhdGVnb3JpZXMgJyArIFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hQW5kKGNhdGVnb3JpZXMpICsgJyBoYXZlIG5vIGNvbW1vbiBkb21haW4uJyk7XG4gICAgfVxuICAgIGRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbiAoZG9tYWluKSB7XG4gICAgICAgIGZuKG1vZGVsLCBkb21haW4pLmZvckVhY2goZnVuY3Rpb24gKHdvcmRjYXQpIHtcbiAgICAgICAgICAgIHJlc1t3b3JkY2F0XSA9IHRydWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICByZXR1cm4geyBkb21haW5zOiBkb21haW5zLFxuICAgICAgICBjYXRlZ29yeVNldDogcmVzIH07XG59XG5leHBvcnRzLmdldERvbWFpbkNhdGVnb3J5RmlsdGVyRm9yVGFyZ2V0Q2F0ZWdvcmllcyA9IGdldERvbWFpbkNhdGVnb3J5RmlsdGVyRm9yVGFyZ2V0Q2F0ZWdvcmllcztcbmZ1bmN0aW9uIGdldERvbWFpbkNhdGVnb3J5RmlsdGVyRm9yVGFyZ2V0Q2F0ZWdvcnkobW9kZWwsIGNhdGVnb3J5LCB3b3Jkc29ubHkpIHtcbiAgICByZXR1cm4gZ2V0RG9tYWluQ2F0ZWdvcnlGaWx0ZXJGb3JUYXJnZXRDYXRlZ29yaWVzKG1vZGVsLCBbY2F0ZWdvcnldLCB3b3Jkc29ubHkpO1xufVxuZXhwb3J0cy5nZXREb21haW5DYXRlZ29yeUZpbHRlckZvclRhcmdldENhdGVnb3J5ID0gZ2V0RG9tYWluQ2F0ZWdvcnlGaWx0ZXJGb3JUYXJnZXRDYXRlZ29yeTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
