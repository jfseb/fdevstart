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

import * as process from 'process';

var modelPath = process.env["MODELPATH"] || "testmodel";


interface IModels {
    domains: string[],
    tools: IMatch.ITool[],
    category: string[],
    mRules: IMatch.mRule[],
    records: any[]
    seenRules?: { [key: string]: IMatch.mRule }
}

interface IModel {
    domain: string,
    tool: IMatch.ITool,
    toolhidden?: boolean,
    synonyms?: { [key: string]: string[] },
    category: string[],
    wordindex: string[],
    exactmatch? : string[],
    hidden: string[]
};

function addSynonyms(synonyms: string[], category: string, synonymFor: string, mRules: Array<IMatch.mRule>, seen: { [key: string]: IMatch.mRule }) {
    synonyms.forEach(function (syn) {
        var oRule = {
            category: category,
            matchedString: synonymFor,
            type: IMatch.EnumRuleType.WORD,
            word: syn,
            _ranking: 0.95
        };
        debuglog("inserting synonym" + JSON.stringify(oRule));
        insertRuleIfNotPresent(mRules, oRule, seen);
    });
}

function insertRuleIfNotPresent(mRules: Array<IMatch.mRule>, rule: IMatch.mRule,
    seenRules: { [key: string]: IMatch.mRule }) {
    if (rule.type !== IMatch.EnumRuleType.WORD) {
        mRules.push(rule);
        return;
    }
    if ((rule.word === undefined) || (rule.matchedString === undefined)) {
        throw new Error('illegal rule' + JSON.stringify(rule, undefined, 2));
    }
    var seenRules = seenRules || {};
    var r = JSON.stringify(rule);
    if (seenRules[r]) {
        debuglog("Attempting to insert duplicate" + JSON.stringify(rule, undefined, 2));
        var duplicates = mRules.filter(function (oEntry) {
            return !InputFilterRules.cmpMRule(oEntry, rule);
        });
        if (duplicates.length > 0) {
            return;
        }
    }
    seenRules[r] = rule;
    rule.lowercaseword = rule.word.toLowerCase();
    if (rule.word === "") {
        debuglog('Skipping rule with emtpy word ' + JSON.stringify(rule, undefined, 2));
        loadlog('Skipping rule with emtpy word ' + JSON.stringify(rule, undefined, 2));
        return;
    }
    mRules.push(rule);
    return;
}

function loadModelData(oMdl: IModel, sModelName: string, oModel: IModels) {
    // read the data ->
    // data is processed into mRules directly,
    const sFileName = ('./' + modelPath + '/' + sModelName + ".data.json");
    var mdldata = fs.readFileSync(sFileName, 'utf-8');
    var oMdlData = JSON.parse(mdldata);
    oMdlData.forEach(function (oEntry) {
        if (!oEntry.tool) {
            oEntry.tool = oMdl.tool.name;
        }
        oModel.records.push(oEntry);

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
                        _ranking: 0.95
                    } as IMatch.mRule;
                if(oMdl.exactmatch && oMdl.exactmatch.indexOf(category) >= 0) {
                    oRule.exactOnly = true;
                }
                insertRuleIfNotPresent(oModel.mRules,oRule, oModel.seenRules);
                if (oMdlData.synonyms && oMdlData.synonyms[category]) {
                    addSynonyms(oMdlData.synonyms[category], category, sString, oModel.mRules, oModel.seenRules);
                }
            }
        });
    });
}

function loadModel(sModelName: string, oModel: IModels) {
    debuglog(" loading " + sModelName + " ....");
    var mdl = fs.readFileSync('./' + modelPath + '/' + sModelName + ".model.json", 'utf-8');
    var oMdl = JSON.parse(mdl) as IModel;

    if (oModel.domains.indexOf(oMdl.domain) >= 0) {
        debuglog("***********here mdl" + JSON.stringify(oMdl, undefined, 2));

        throw new Error('Domain ' + oMdl.domain + ' already loaded while loading ' + sModelName + '?');
    }
    // extract tools an add to tools:
    oModel.tools.filter(function (oEntry) {
        if (oEntry.name === oMdl.tool.name) {
            console.log("Tool " + oMdl.tool.name + " already present when loading " + sModelName);
            //throw new Error('Domain already loaded?');
            process.exit(-1);
        }
    });
    // add the tool name as rule unless hidden
    if (!oMdl.toolhidden) {
        insertRuleIfNotPresent(oModel.mRules, {
            category: "tool",
            matchedString: oMdl.tool.name,
            type: IMatch.EnumRuleType.WORD,
            word: oMdl.tool.name,
            _ranking: 0.95
        }, oModel.seenRules);
    };
    if (oMdl.synonyms && oMdl.synonyms["tool"]) {
        addSynonyms(oMdl.synonyms["tool"], "tool", oMdl.tool.name, oModel.mRules, oModel.seenRules);
    };
    if (oMdl.synonyms) {
        Object.keys(oMdl.synonyms).forEach(function (ssynkey) {
            if (oMdl.category.indexOf(ssynkey) >= 0 && ssynkey !== "tool") {
                addSynonyms(oMdl.synonyms[ssynkey], "category", ssynkey, oModel.mRules, oModel.seenRules);
            }
        });
    }
    oModel.domains.push(oMdl.domain);
    oModel.tools.push(oMdl.tool);
    oModel.category = oModel.category.concat(oMdl.category);
    oModel.category.sort();
    oModel.category = oModel.category.filter(function (string, index) {
        return oModel.category[index] !== oModel.category[index + 1];
    });
    loadModelData(oMdl, sModelName, oModel);
} // loadmodel


export function loadModels() {
    var oModel: IModels;
    oModel = {
        domains: [],
        tools: [],
        category: [],
        mRules: [],
        records: []
    }
    var smdls = fs.readFileSync('./' + modelPath + '/models.json', 'utf-8');
    var mdls = JSON.parse("" + smdls);
    mdls.forEach(function (sModelName) {
        loadModel(sModelName, oModel)
    });

    // add the categories to the model:
    oModel.category.forEach(function (category) {
        insertRuleIfNotPresent(oModel.mRules, {
            category: "category",
            matchedString: category,
            type: IMatch.EnumRuleType.WORD,
            word: category,
            lowercaseword: category.toLowerCase(),
            _ranking: 0.95
        }, oModel.seenRules);
    });

    //add a filler rule
    var sfillers = fs.readFileSync('./' + modelPath + '/filler.json', 'utf-8');
    var fillers = JSON.parse(sfillers);
    var re = "^((" + fillers.join(")|(") + "))$";
    oModel.mRules.push({
        category: "filler",
        type: IMatch.EnumRuleType.REGEXP,
        regexp: new RegExp(re, "i"),
        matchedString: "filler",
        _ranking: 0.9
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
    oModel.tools = oModel.tools.sort(Tools.cmpTools);
    delete oModel.seenRules;
    return oModel;
}


