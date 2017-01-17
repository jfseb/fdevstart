/**
 * Functionality managing the match models
 *
 * @file
 */
"use strict";
var debug = require('debug');
var debuglog = debug('model');
var logger = require('../utils/logger');
var loadlog = logger.logger('modelload', '');
var IMatch = require('../match/ifmatch');
var InputFilterRules = require('../match/inputFilterRules');
var Tools = require('../match/tools');
var fs = require('fs');
var Meta = require('./meta');
var Utils = require('../utils/utils');
var process = require('process');
var _ = require('lodash');
/**
 * the model path, may be controlled via environment variable
 */
var envModelPath = process.env["ABOT_MODELPATH"] || "testmodel";
;
var ARR_MODEL_PROPERTIES = ["domain", "tool", "toolhidden", "synonyms", "category", "wordindex", "exactmatch", "hidden"];
function addSynonyms(synonyms, category, synonymFor, mRules, seen) {
    synonyms.forEach(function (syn) {
        var oRule = {
            category: category,
            matchedString: synonymFor,
            type: 0 /* WORD */,
            word: syn,
            _ranking: 0.95
        };
        debuglog("inserting synonym" + JSON.stringify(oRule));
        insertRuleIfNotPresent(mRules, oRule, seen);
    });
}
function getRuleKey(rule) {
    return rule.matchedString + "-|-" + rule.category + " -|- " + rule.type + " -|- " + rule.word + " ";
}
function insertRuleIfNotPresent(mRules, rule, seenRules) {
    if (rule.type !== 0 /* WORD */) {
        mRules.push(rule);
        return;
    }
    if ((rule.word === undefined) || (rule.matchedString === undefined)) {
        throw new Error('illegal rule' + JSON.stringify(rule, undefined, 2));
    }
    var r = getRuleKey(rule);
    rule.lowercaseword = rule.word.toLowerCase();
    if (seenRules[r]) {
        debuglog("Attempting to insert duplicate" + JSON.stringify(rule, undefined, 2));
        var duplicates = seenRules[r].filter(function (oEntry) {
            return 0 === InputFilterRules.compareMRuleFull(oEntry, rule);
        });
        if (duplicates.length > 0) {
            return;
        }
    }
    seenRules[r] = (seenRules[r] || []);
    seenRules[r].push(rule);
    if (rule.word === "") {
        debuglog('Skipping rule with emtpy word ' + JSON.stringify(rule, undefined, 2));
        loadlog('Skipping rule with emtpy word ' + JSON.stringify(rule, undefined, 2));
        return;
    }
    mRules.push(rule);
    return;
}
function loadModelData(modelPath, oMdl, sModelName, oModel) {
    // read the data ->
    // data is processed into mRules directly,
    var sFileName = ('./' + modelPath + '/' + sModelName + ".data.json");
    var mdldata = fs.readFileSync(sFileName, 'utf-8');
    var oMdlData = JSON.parse(mdldata);
    oMdlData.forEach(function (oEntry) {
        if (!oEntry.tool && oMdl.tool.name) {
            oEntry.tool = oMdl.tool.name;
            oEntry._domain = oMdl.domain;
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
                    type: 0 /* WORD */,
                    word: sString,
                    _ranking: 0.95
                };
                if (oMdl.exactmatch && oMdl.exactmatch.indexOf(category) >= 0) {
                    oRule.exactOnly = true;
                }
                insertRuleIfNotPresent(oModel.mRules, oRule, oModel.seenRules);
                if (oMdlData.synonyms && oMdlData.synonyms[category]) {
                    addSynonyms(oMdlData.synonyms[category], category, sString, oModel.mRules, oModel.seenRules);
                }
                if (oEntry.synonyms && oEntry.synonyms[category]) {
                    addSynonyms(oEntry.synonyms[category], category, sString, oModel.mRules, oModel.seenRules);
                }
            }
        });
    });
}
function loadModel(modelPath, sModelName, oModel) {
    debuglog(" loading " + sModelName + " ....");
    var mdl = fs.readFileSync('./' + modelPath + '/' + sModelName + ".model.json", 'utf-8');
    var oMdl = JSON.parse(mdl);
    if (oModel.domains.indexOf(oMdl.domain) >= 0) {
        debuglog("***********here mdl" + JSON.stringify(oMdl, undefined, 2));
        throw new Error('Domain ' + oMdl.domain + ' already loaded while loading ' + sModelName + '?');
    }
    // check properties of model
    Object.keys(oMdl).sort().forEach(function (sProperty) {
        if (ARR_MODEL_PROPERTIES.indexOf(sProperty) < 0) {
            throw new Error('Model property "' + sProperty + '" not a known model propperty in model of domain ' + oMdl.domain + ' ');
        }
    });
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
        type: 0 /* WORD */,
        word: oMdl.domain,
        _ranking: 0.95
    }, oModel.seenRules);
    // extract tools an add to tools:
    oModel.tools.filter(function (oEntry) {
        if (oEntry.name === (oMdl.tool && oMdl.tool.name)) {
            console.log("Tool " + oMdl.tool.name + " already present when loading " + sModelName);
            //throw new Error('Domain already loaded?');
            process.exit(-1);
        }
    });
    // add the tool name as rule unless hidden
    if (!oMdl.toolhidden && oMdl.tool && oMdl.tool.name) {
        insertRuleIfNotPresent(oModel.mRules, {
            category: "tool",
            matchedString: oMdl.tool.name,
            type: 0 /* WORD */,
            word: oMdl.tool.name,
            _ranking: 0.95
        }, oModel.seenRules);
    }
    ;
    if (oMdl.synonyms && oMdl.synonyms["tool"]) {
        addSynonyms(oMdl.synonyms["tool"], "tool", oMdl.tool.name, oModel.mRules, oModel.seenRules);
    }
    ;
    if (oMdl.synonyms) {
        Object.keys(oMdl.synonyms).forEach(function (ssynkey) {
            if (oMdl.category.indexOf(ssynkey) >= 0 && ssynkey !== "tool") {
                addSynonyms(oMdl.synonyms[ssynkey], "category", ssynkey, oModel.mRules, oModel.seenRules);
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
    loadModelData(modelPath, oMdl, sModelName, oModel);
} // loadmodel
function splitRules(rules) {
    var res = {};
    var nonWordRules = [];
    rules.forEach(function (rule) {
        if (rule.type === 0 /* WORD */) {
            if (!rule.lowercaseword) {
                throw new Error("Rule has no member lowercaseword" + JSON.stringify(rule));
            }
            res[rule.lowercaseword] = res[rule.lowercaseword] || [];
            res[rule.lowercaseword].push(rule);
        }
        else {
            nonWordRules.push(rule);
        }
    });
    return {
        wordMap: res,
        nonWordRules: nonWordRules,
        allRules: rules
    };
}
exports.splitRules = splitRules;
function loadModels(modelPath) {
    var oModel;
    oModel = {
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
    modelPath = modelPath || envModelPath;
    var smdls = fs.readFileSync('./' + modelPath + '/models.json', 'utf-8');
    var mdls = JSON.parse("" + smdls);
    mdls.forEach(function (sModelName) {
        loadModel(modelPath, sModelName, oModel);
    });
    // add the categories to the model:
    oModel.category.forEach(function (category) {
        insertRuleIfNotPresent(oModel.mRules, {
            category: "category",
            matchedString: category,
            type: 0 /* WORD */,
            word: category,
            lowercaseword: category.toLowerCase(),
            _ranking: 0.95
        }, oModel.seenRules);
    });
    // add the domain meta rule
    insertRuleIfNotPresent(oModel.mRules, {
        category: "meta",
        matchedString: "domain",
        type: 0 /* WORD */,
        word: "domain",
        _ranking: 0.95
    }, oModel.seenRules);
    //add a filler rule
    var sfillers = fs.readFileSync('./' + modelPath + '/filler.json', 'utf-8');
    var fillers = JSON.parse(sfillers);
    var re = "^((" + fillers.join(")|(") + "))$";
    oModel.mRules.push({
        category: "filler",
        type: 1 /* REGEXP */,
        regexp: new RegExp(re, "i"),
        matchedString: "filler",
        _ranking: 0.9
    });
    //add operators
    var sOperators = fs.readFileSync('./resources/model/operators.json', 'utf-8');
    var operators = JSON.parse(sOperators);
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
            type: 0 /* WORD */,
            matchedString: word,
            _ranking: 0.9
        }, oModel.seenRules);
        // add all synonyms
        if (operators.synonyms[operator]) {
            Object.keys(operators.synonyms[operator]).forEach(function (synonym) {
                insertRuleIfNotPresent(oModel.mRules, {
                    category: "operator",
                    word: synonym.toLowerCase(),
                    lowercaseword: synonym.toLowerCase(),
                    type: 0 /* WORD */,
                    matchedString: operator,
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
    oModel.rules = splitRules(oModel.mRules);
    oModel.tools = oModel.tools.sort(Tools.cmpTools);
    delete oModel.seenRules;
    return oModel;
}
exports.loadModels = loadModels;
var MetaF = Meta.getMetaFactory();
function getOperator(mdl, operator) {
    return mdl.operators[operator];
}
exports.getOperator = getOperator;
function getResultAsArray(mdl, a, rel) {
    if (rel.toType() !== 'relation') {
        throw new Error("expect relation as 2nd arg");
    }
    var res = mdl.meta.t3[a.toFullString()] &&
        mdl.meta.t3[a.toFullString()][rel.toFullString()];
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
function getAllRecordCategoriesForTargetCategory(model, category, wordsonly) {
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
exports.getAllRecordCategoriesForTargetCategory = getAllRecordCategoriesForTargetCategory;
function getAllRecordCategoriesForTargetCategories(model, categories, wordsonly) {
    var res = {};
    //
    var fn = wordsonly ? getPotentialWordCategoriesForDomain : getCategoriesForDomain;
    var domains = undefined;
    categories.forEach(function (category) {
        var catdomains = getDomainsForCategory(model, category);
        if (!domains) {
            domains = catdomains;
        }
        else {
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
    return res;
}
exports.getAllRecordCategoriesForTargetCategories = getAllRecordCategoriesForTargetCategories;

//# sourceMappingURL=model.js.map
