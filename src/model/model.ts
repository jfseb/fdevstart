/**
 * Functionality managing the match models
 *
 * @file
 */

import * as intf from 'constants';

import * as debug from 'debug';

var debuglog = debug('model');

import *  as IMatch from '../match/ifmatch';

import * as Match from '../match/match';

import * as InputFilterRules from '../match/inputFilterRules';

import * as Tools from '../match/tools';

import * as fs from 'fs';

import * as process from 'process';

interface IModels {
    domains: string[],
    tools: IMatch.ITool[],
    category: string[],
    mRules: IMatch.mRule[],
    records : any[];
}

interface IModel {
    domain: string,
    tool: IMatch.ITool,
    toolhidden?: boolean,
    synonyms?: { [key: string]: string[] },
    category: string[],
    wordindex: string[],
    hidden: string[]
};

function addSynonyms(synonyms: string[], category: string, synonymFor: string, mRules: Array<IMatch.mRule>) {
    synonyms.forEach(function(syn) {
        var oRule =  {
            category: category,
            matchedString: synonymFor,
            type: IMatch.EnumRuleType.WORD,
            word: syn,
            _ranking: 0.95
        };
        debuglog("inserting synonym" + JSON.stringify(oRule));
        insertRuleIfNotPresent(mRules,oRule);
       });
}

function insertRuleIfNotPresent(mRules : Array<IMatch.mRule>, rule: IMatch.mRule) {
    if (rule.type !== IMatch.EnumRuleType.WORD) {
        mRules.push(rule);
        return;
    }
    if((rule.word === undefined) || (rule.matchedString === undefined)) {
        throw new Error('illegal rule' + JSON.stringify(rule,undefined,2));
    }
    var duplicates = mRules.filter(function(oEntry) {
        return !InputFilterRules.cmpMRule(oEntry,rule);
    });
    if(!duplicates.length) {
        mRules.push(rule);
    }
    debuglog("Attempting to insert duplicate" + JSON.stringify(rule,undefined,2));
}


function loadModelData(oMdl: IModel, sModelName: string, oModel: IModels) {
    // read the data ->
    // data is processed into mRules directly,
    const sFileName = ('./sensitive/' + sModelName + ".data.json");
    var mdldata = fs.readFileSync(sFileName, 'utf-8');
    var oMdlData = JSON.parse(mdldata);
    oMdlData.forEach(function(oEntry) {

        if (!oEntry.tool) {
            oEntry.tool = oMdl.tool.name;
        }

        oModel.records.push(oEntry);

        oMdl.wordindex.forEach(function(category) {
              if (oEntry[category] === undefined) {
                debuglog("INCONSISTENT*> ModelData " + sFileName + " does not contain category "+ category+" of wordindex" + JSON.stringify(oEntry) + "")
                return;
            }
            if (oEntry[category] !== "*") {
                var sString = oEntry[category];
                debuglog("pushing rule with "+ category + " -> " + sString);
                insertRuleIfNotPresent(oModel.mRules,
                    {
                        category: category,
                        matchedString: sString,
                        type: IMatch.EnumRuleType.WORD,
                        word: sString,
                        _ranking: 0.95
                    });
                if (oMdlData.synonyms && oMdlData.synonyms[category]) {
                    addSynonyms(oMdlData.synonyms[category], category, sString, oModel.mRules);
                }
            }
        });
    });
}

function loadModel(sModelName: string, oModel: IModels) {
    debuglog(" loading " + sModelName + " ....");
    var mdl = fs.readFileSync('./sensitive/' + sModelName + ".model.json", 'utf-8');
    var oMdl = JSON.parse(mdl) as IModel;

    if (oModel.domains.indexOf(oMdl.domain)>= 0) {
        debuglog("***********here mdl" + JSON.stringify(oMdl,undefined, 2));

        throw new Error('Domain ' + oMdl.domain + ' already loaded while loading ' + sModelName + '?');
    }
    // extract tools an add to tools:
    oModel.tools.filter(function(oEntry) {
        if (oEntry.name === oMdl.tool.name) {
            console.log("Tool " + oMdl.tool.name + " already present when loading " + sModelName);
            //throw new Error('Domain already loaded?');
            process.exit(-1);
        }
    });
    // add the tool name as rule unless hidden
    if (!oMdl.toolhidden) {
        oModel.mRules.push({
            category: "tool",
            matchedString: oMdl.tool.name,
            type: IMatch.EnumRuleType.WORD,
            word: oMdl.tool.name,
            _ranking: 0.95
        });
    };
    if (oMdl.synonyms && oMdl.synonyms["tool"]) {
        addSynonyms(oMdl.synonyms["tool"], "tool", oMdl.tool.name, oModel.mRules);
    };
    if (oMdl.synonyms) {
        Object.keys(oMdl.synonyms).forEach(function(ssynkey) {
            if (oMdl.category.indexOf(ssynkey) >= 0 && ssynkey !== "tool") {
                addSynonyms(oMdl.synonyms[ssynkey], "category", ssynkey, oModel.mRules);
            }
        });
    }
    oModel.domains.push(oMdl.domain);
    oModel.tools.push(oMdl.tool);
    oModel.category = oModel.category.concat(oMdl.category);
    oModel.category.sort();
    oModel.category = oModel.category.filter(function(string, index) {
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
        records : []
    }
    var smdls = fs.readFileSync('./sensitive/models.json', 'utf-8');
    var mdls = JSON.parse("" + smdls);
    mdls.forEach(function(sModelName) {
        loadModel(sModelName, oModel)
    });

    // add the categories to the model:
    oModel.category.forEach(function(category) {
        insertRuleIfNotPresent(oModel.mRules,{
            category: "category",
            matchedString: category,
            type: IMatch.EnumRuleType.WORD,
            word: category,
            _ranking: 0.95
        });
    });

    //add a filler rule
    var sfillers = fs.readFileSync('./sensitive/filler.json','utf-8');
    var fillers = JSON.parse(sfillers);
    var re = "^((" + fillers.join(")|(") + "))$";
    oModel.mRules.push({
      category: "filler",
      type: IMatch.EnumRuleType.REGEXP,
      regexp: new RegExp(re,"i"),
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
    return oModel;
}


