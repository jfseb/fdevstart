/**
 * Functionality managing the match models
 *
 * @file
 */

import * as intf from 'constants';
import * as debug from 'debug';

var debuglog = debug('model');

import * as logger from '../utils/logger';

const loadlog = logger.logger('modelload', '');

import *  as IMatch from '../match/ifmatch';
import * as Match from '../match/match';
import * as InputFilterRules from '../match/inputFilterRules';
import * as Tools from '../match/tools';
import * as fs from 'fs';
import * as Meta from './meta';
import * as Utils from '../utils/utils';
import * as process from 'process';
import * as _ from 'lodash';

/**
 * the model path, may be controlled via environment variable
 */
var envModelPath = process.env["ABOT_MODELPATH"] || "testmodel";

//export interface IModels = Match.IModels;

/*
export interface IModels {
    domains: string[],
    tools: IMatch.ITool[],
    category: string[],
    mRules: IMatch.mRule[],
    records: any[]
    seenRules?: { [key: string]: IMatch.mRule },
    meta : {
        // entity -> relation -> target
        t3 : { [key: string] : { [key : string] : any }}
    }
}*/

interface IModel {
    domain: string,
    bitindex : number,
    description? : string,
    tool: IMatch.ITool,
    toolhidden?: boolean,
    synonyms?: { [key: string]: string[] },
    categoryDescribed :  { name : string,
        description? : string,
        key? : string }[],
    category: string[],
    wordindex: string[],
    exactmatch? : string[],
    hidden: string[]
};

const ARR_MODEL_PROPERTIES = ["domain", "bitindex", "categoryDescribed", "description", "tool", "toolhidden", "synonyms", "category", "wordindex", "exactmatch", "hidden"];

function addSynonyms(synonyms: string[], category: string, synonymFor: string, bitindex : number, mRules: Array<IMatch.mRule>, seen: { [key: string]: IMatch.mRule[] }) {
    synonyms.forEach(function (syn) {
        var oRule = {
            category: category,
            matchedString: synonymFor,
            type: IMatch.EnumRuleType.WORD,
            word: syn,
            bitindex : bitindex,
            _ranking: 0.95
        };
        debuglog("inserting synonym" + JSON.stringify(oRule));
        insertRuleIfNotPresent(mRules, oRule, seen);
    });
}

function getRuleKey(rule) {
    return rule.matchedString + "-|-" + rule.category + " -|- " + rule.type  + " -|- " + rule.word + " ";
}

function insertRuleIfNotPresent(mRules: Array<IMatch.mRule>, rule: IMatch.mRule,
    seenRules: { [key: string]: IMatch.mRule[] }) {

    if (rule.type !== IMatch.EnumRuleType.WORD) {
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
        var duplicates = seenRules[r].filter(function( oEntry) {
            return 0 === InputFilterRules.compareMRuleFull(oEntry,rule);
        });
        if(duplicates.length > 0) {
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

function loadModelData(modelPath: string, oMdl: IModel, sModelName: string, oModel: IMatch.IModels) {
    // read the data ->
    // data is processed into mRules directly,
    var bitindex = oMdl.bitindex;
    const sFileName = ('./' + modelPath + '/' + sModelName + ".data.json");
    var mdldata = fs.readFileSync(sFileName, 'utf-8');
    var oMdlData = JSON.parse(mdldata);
    oMdlData.forEach(function (oEntry) {
        if(!oEntry.tool) {
            oEntry._domain = oMdl.domain;
        }
        if (!oEntry.tool && oMdl.tool.name) {
            oEntry.tool = oMdl.tool.name;
        }
        oModel.records.push(oEntry);
        oMdl.category.forEach(function(cat) {
            if(oEntry[cat] === 'undefined') {
                oEntry[cat] = "n/a";
                var bug =
                    "INCONSISTENT*> ModelData " + sFileName + " does not contain category " + cat + " with value 'undefined', undefined is illegal value, use n/a " + JSON.stringify(oEntry) + "";
                debuglog(bug);
                //console.log(bug);
                //process.exit(-1);
            }
        })

        oMdl.wordindex.forEach(function (category) {
            if (oEntry[category] === undefined) {
                debuglog("INCONSISTENT*> ModelData " + sFileName + " does not contain category " + category + " of wordindex" + JSON.stringify(oEntry) + "")
                return;
            }
            if (oEntry[category] !== "*") {
                var sString = oEntry[category];
                debuglog("pushing rule with " + category + " -> " + sString);
                var oRule = {
                        category: category,
                        matchedString: sString,
                        type: IMatch.EnumRuleType.WORD,
                        word: sString,
                        bitindex : bitindex,
                        _ranking: 0.95
                    } as IMatch.mRule;
                if(oMdl.exactmatch && oMdl.exactmatch.indexOf(category) >= 0) {
                    oRule.exactOnly = true;
                }
                insertRuleIfNotPresent(oModel.mRules,oRule, oModel.seenRules);
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




function loadModel(modelPath : string, sModelName: string, oModel: IMatch.IModels) {
    debuglog(" loading " + sModelName + " ....");
    var mdl = fs.readFileSync('./' + modelPath + '/' + sModelName + ".model.json", 'utf-8');
    var oMdl = JSON.parse(mdl) as IModel;
    mergeModelJson(sModelName, oMdl, oModel);
    loadModelData(modelPath, oMdl, sModelName, oModel);
}

export function getDomainBitIndex(domain: string, oModel: IMatch.IModels) : number {
    var index = oModel.domains.indexOf(domain);
    if(index < 0) {
        index = oModel.domains.length;
    }
    if(index >= 32) {
        throw new Error("too many domain for single 32 bit index");
    }
    return 0x0001 << index;
}

function mergeModelJson(sModelName: string, oMdl: IModel, oModel: IMatch.IModels) {
    var categoryDescribedMap = {} as { [key: string] : IMatch.ICategoryDesc };
    oMdl.bitindex = getDomainBitIndex(oMdl.domain, oModel);
    oMdl.categoryDescribed = [];
    // rectify category
    oMdl.category = oMdl.category.map(function(cat : any) {
        if(typeof cat === "string") {
            return cat;
        }
        if(typeof cat.name !== "string") {
            console.log("Missing name in object typed category in " + JSON.stringify(cat) + " in model " + sModelName );
            process.exit(-1);
            //throw new Error('Domain ' + oMdl.domain + ' already loaded while loading ' + sModelName + '?');
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
            type: IMatch.EnumRuleType.WORD,
            word: category,
            lowercaseword: category.toLowerCase(),
            bitindex : oMdl.bitindex,
            _ranking: 0.95
        }, oModel.seenRules);
    });

    if (oModel.domains.indexOf(oMdl.domain) >= 0) {
        debuglog("***********here mdl" + JSON.stringify(oMdl, undefined, 2));
        throw new Error('Domain ' + oMdl.domain + ' already loaded while loading ' + sModelName + '?');
    }
    // check properties of model
    Object.keys(oMdl).sort().forEach(function(sProperty) {
        if(ARR_MODEL_PROPERTIES.indexOf(sProperty) < 0) {
            throw new Error('Model property "' + sProperty + '" not a known model property in model of domain ' + oMdl.domain + ' ');
        }
    });
    oModel.full.domain[oMdl.domain] = {
        description : oMdl.description,
        categories : categoryDescribedMap,
        bitindex : oMdl.bitindex
    };


    // check that members of wordindex are in categories,
    oMdl.wordindex = oMdl.wordindex || [];
    oMdl.wordindex.forEach(function(sWordIndex) {
        if(oMdl.category.indexOf(sWordIndex) < 0) {
            throw new Error('Model wordindex "' + sWordIndex + '" not a category of domain ' + oMdl.domain + ' ');
        }
    });
    oMdl.exactmatch = oMdl.exactmatch || [];
    oMdl.exactmatch.forEach(function(sExactMatch) {
        if(oMdl.category.indexOf(sExactMatch) < 0) {
            throw new Error('Model exactmatch "' + sExactMatch + '" not a category of domain ' + oMdl.domain + ' ');
        }
    });


    // add relation domain -> category
    var domainStr = MetaF.Domain(oMdl.domain).toFullString();
    var relationStr = MetaF.Relation(Meta.RELATION_hasCategory).toFullString();
    var reverseRelationStr = MetaF.Relation(Meta.RELATION_isCategoryOf).toFullString();
    oMdl.category.forEach(function(sCategory) {

        var CategoryString = MetaF.Category(sCategory).toFullString();
        oModel.meta.t3[domainStr] = oModel.meta.t3[domainStr] || {};
        oModel.meta.t3[domainStr][relationStr] = oModel.meta.t3[domainStr][relationStr] || {};
        oModel.meta.t3[domainStr][relationStr][CategoryString]  = {};

        oModel.meta.t3[CategoryString] = oModel.meta.t3[CategoryString] || {};
        oModel.meta.t3[CategoryString][reverseRelationStr] = oModel.meta.t3[CategoryString][reverseRelationStr] || {};
        oModel.meta.t3[CategoryString][reverseRelationStr][domainStr]  = {};

    });

    // add a precice domain matchrule
    insertRuleIfNotPresent(oModel.mRules, {
            category: "domain",
            matchedString: oMdl.domain,
            type: IMatch.EnumRuleType.WORD,
            word: oMdl.domain,
            bitindex : oMdl.bitindex,
            _ranking: 0.95
        }, oModel.seenRules);

    // check the tool
    if(oMdl.tool && oMdl.tool.requires) {
        var requires = Object.keys(oMdl.tool.requires || {});
        var diff = _.difference(requires, oMdl.category);
            if(diff.length > 0) {
                console.log(` ${oMdl.domain} : Unkown category in requires of tool: "` + diff.join('"') + '"');
                process.exit(-1);
            }
        var optional = Object.keys(oMdl.tool.optional);
        diff = _.difference(optional, oMdl.category);
            if(diff.length > 0) {
                console.log(` ${oMdl.domain} : Unkown category optional of tool: "` + diff.join('"') + '"');
                process.exit(-1);
            }
        Object.keys(oMdl.tool.sets || {}).forEach(function(setID) {
            var diff = _.difference(oMdl.tool.sets[setID].set, oMdl.category);
            if(diff.length > 0) {
                console.log(` ${oMdl.domain} : Unkown category in setId ${setID} of tool: "` + diff.join('"') + '"');
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
        oMdl.tool.requires = { "impossible" : {}};
    }
    // add the tool name as rule unless hidden
    if (!oMdl.toolhidden && oMdl.tool && oMdl.tool.name) {
        insertRuleIfNotPresent(oModel.mRules, {
            category: "tool",
            matchedString: oMdl.tool.name,
            type: IMatch.EnumRuleType.WORD,
            word: oMdl.tool.name,
            bitindex : oMdl.bitindex,
            _ranking: 0.95
        }, oModel.seenRules);
    };
    if (oMdl.synonyms && oMdl.synonyms["tool"]) {
        addSynonyms(oMdl.synonyms["tool"], "tool", oMdl.tool.name, oMdl.bitindex, oModel.mRules, oModel.seenRules);
    };
    if (oMdl.synonyms) {
        Object.keys(oMdl.synonyms).forEach(function (ssynkey) {
            if (oMdl.category.indexOf(ssynkey) >= 0 && ssynkey !== "tool") {
                if (oModel.full.domain[oMdl.domain].categories[ssynkey])  {
                   oModel.full.domain[oMdl.domain].categories[ssynkey].synonyms = oMdl.synonyms[ssynkey];
                }

                addSynonyms(oMdl.synonyms[ssynkey], "category", ssynkey, oMdl.bitindex, oModel.mRules, oModel.seenRules);
            }
        });
    }
    oModel.domains.push(oMdl.domain);
    if(oMdl.tool.name) {
      oModel.tools.push(oMdl.tool);
    }
    oModel.category = oModel.category.concat(oMdl.category);
    oModel.category.sort();
    oModel.category = oModel.category.filter(function (string, index) {
        return oModel.category[index] !== oModel.category[index + 1];
    });

} // loadmodel

export function splitRules(rules : IMatch.mRule[]) : IMatch.SplitRules {
    var res = {};
    var nonWordRules = [];
    rules.forEach(function(rule) {
        if(rule.type === IMatch.EnumRuleType.WORD) {
            if(!rule.lowercaseword) {
                throw new Error("Rule has no member lowercaseword" + JSON.stringify(rule));
            }
            res[rule.lowercaseword] = res[rule.lowercaseword] || { bitindex : 0, rules :[] };
            res[rule.lowercaseword].bitindex = res[rule.lowercaseword].bitindex | rule.bitindex;
            res[rule.lowercaseword].rules.push(rule);
        } else {
            nonWordRules.push(rule);
        }
    });
    return {
        wordMap: res,
        nonWordRules : nonWordRules,
        allRules : rules
    };
}

export function loadModels(modelPath? : string) : IMatch.IModels {
    var oModel: IMatch.IModels;
    oModel = {
        full : { domain : {}},
        domains: [],
        tools: [],
        rules : undefined,
        category: [],
        operators : {},
        mRules: [],
        seenRules : {},
        records: [],
        meta : { t3 : {} }
    }
    modelPath = modelPath || envModelPath;
    var smdls = fs.readFileSync('./' + modelPath + '/models.json', 'utf-8');
    var mdls = JSON.parse("" + smdls);
    mdls.forEach(function (sModelName) {
        loadModel(modelPath, sModelName, oModel)
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

    var metaBitIndex = getDomainBitIndex('meta',oModel);

    // add the domain meta rule
    insertRuleIfNotPresent(oModel.mRules, {
            category: "meta",
            matchedString: "domain",
            type: IMatch.EnumRuleType.WORD,
            word: "domain",
            bitindex : metaBitIndex,
            _ranking: 0.95
        }, oModel.seenRules);


    var fillerBitIndex = getDomainBitIndex('meta',oModel);
    //add a filler rule
    var sfillers = fs.readFileSync('./' + modelPath + '/filler.json', 'utf-8');
    var fillers = JSON.parse(sfillers);
    var re = "^((" + fillers.join(")|(") + "))$";
    oModel.mRules.push({
        category: "filler",
        type: IMatch.EnumRuleType.REGEXP,
        regexp: new RegExp(re, "i"),
        matchedString: "filler",
        bitindex : fillerBitIndex,
        _ranking: 0.9
    });

    //add operators
    var sOperators = fs.readFileSync('./resources/model/operators.json', 'utf-8');
    var operators = JSON.parse(sOperators);
    var operatorBitIndex = getDomainBitIndex('operators',oModel);
    Object.keys(operators.operators).forEach(function(operator) {
        if(IMatch.aOperatorNames.indexOf(operator) < 0) {
            debuglog("unknown operator " + operator);
            throw new Error("unknown operator " + operator);
        }
        oModel.operators[operator] = operators.operators[operator];
        oModel.operators[operator].operator = <IMatch.OperatorName> operator;
        Object.freeze(oModel.operators[operator]);
        var word = operator;
        insertRuleIfNotPresent(oModel.mRules, {
            category: "operator",
            word : word.toLowerCase(),
            lowercaseword : word.toLowerCase(),
            type: IMatch.EnumRuleType.WORD,
            matchedString : word,
            bitindex : operatorBitIndex,
            _ranking: 0.9
        }, oModel.seenRules);
        // add all synonyms
        if(operators.synonyms[operator]) {
            Object.keys(operators.synonyms[operator]).forEach(function(synonym) {
                insertRuleIfNotPresent(oModel.mRules,{
                    category: "operator",
                    word : synonym.toLowerCase(),
                    lowercaseword : synonym.toLowerCase(),
                    type: IMatch.EnumRuleType.WORD,
                    matchedString : operator,
                    bitindex : operatorBitIndex,
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

export function sortCategoriesByImportance( map : {[key : string] : IMatch.ICategoryDesc }, cats : string[]) : string[] {
    var res = cats.slice(0);
    res.sort(rankCategoryByImportance.bind(undefined,map));
    return res;
}

export function rankCategoryByImportance(map : {[key : string] : IMatch.ICategoryDesc }, cata : string, catb : string) : number {
    var catADesc = map[cata];
    var catBDesc = map[catb];
    if (cata === catb) {
        return 0;
    }
    // if a is before b, return -1
    if(catADesc && !catBDesc) {
        return -1;
    }
    if(!catADesc && catBDesc) {
        return +1;
    }

    var prioA = (catADesc && catADesc.importance) || 99;
    var prioB = (catBDesc && catBDesc.importance) || 99;
    // lower prio goes to front
    var r = prioA - prioB;
    if(r) {
        return r;
    }
    return cata.localeCompare(catb);
}

const MetaF = Meta.getMetaFactory();

export function getOperator(mdl: IMatch.IModels, operator : string) : IMatch.IOperator {
    return mdl.operators[operator];
}

export function getResultAsArray(mdl : IMatch.IModels, a : Meta.IMeta, rel : Meta.IMeta) : Meta.IMeta[] {
    if(rel.toType() !== 'relation') {
        throw new Error("expect relation as 2nd arg");
    }

    var res = mdl.meta.t3[a.toFullString()] &&
    mdl.meta.t3[a.toFullString()][rel.toFullString()];
    if(!res) {
        return [];
    }
    return Object.getOwnPropertyNames(res).sort().map(MetaF.parseIMeta);
}

export function getCategoriesForDomain(theModel : IMatch.IModels, domain : string) : string[] {
    if(theModel.domains.indexOf(domain) < 0) {
        throw new Error("Domain \"" + domain + "\" not part of model");
    }
    var res = getResultAsArray(theModel, MetaF.Domain(domain), MetaF.Relation(Meta.RELATION_hasCategory));
    return Meta.getStringArray(res);
}

/**
 * Return all categories of a domain which can appear on a word,
 * these are typically the wordindex domains + entries generated by generic rules
 *
 * The current implementation is a simplification
 */
export function getPotentialWordCategoriesForDomain(theModel : IMatch.IModels, domain : string) : string[] {
    // this is a simplified version
    return getCategoriesForDomain(theModel, domain);
}

export function getDomainsForCategory(theModel : IMatch.IModels, category : string) : string[] {
    if(theModel.category.indexOf(category) < 0) {
        throw new Error("Category \"" + category + "\" not part of model");
    }
    var res = getResultAsArray(theModel, MetaF.Category(category), MetaF.Relation(Meta.RELATION_isCategoryOf));
    return Meta.getStringArray(res);
}


 export function getAllRecordCategoriesForTargetCategory(model : IMatch.IModels, category : string, wordsonly : boolean) : {[key: string] : boolean} {
    var res = {};
    //
    var fn = wordsonly ? getPotentialWordCategoriesForDomain : getCategoriesForDomain;
    var domains = getDomainsForCategory(model, category);
    domains.forEach(function(domain) {
        fn(model, domain).forEach(function(wordcat) {
            res[wordcat] = true;
        });
    });
    Object.freeze(res);
    return res;
 }

 export function getAllRecordCategoriesForTargetCategories(model : IMatch.IModels, categories : string[], wordsonly : boolean) : {[key: string] : boolean} {
    var res = {};
    //
    var fn = wordsonly ? getPotentialWordCategoriesForDomain : getCategoriesForDomain;
    var domains = undefined;
    categories.forEach(function(category) {
        var catdomains = getDomainsForCategory(model, category)
        if(!domains) {
            domains = catdomains;
        } else {
            domains = _.intersection(domains, catdomains);
        }
    });
    if(domains.length === 0) {
        throw new Error('categories ' + Utils.listToQuotedCommaAnd(categories) + ' have no common domain.')
    }
    domains.forEach(function(domain) {
        fn(model, domain).forEach(function(wordcat) {
            res[wordcat] = true;
        });
    });
    Object.freeze(res);
    return res;
 }


