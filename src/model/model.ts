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

import * as fs from 'fs';

import * as process from 'process';

interface IModels {
    domains: string[],
    tools: IMatch.ITool[],
    category: string[],
    mRules: IMatch.mRule[]
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
        mRules.push({
            category: category,
            matchedString: synonymFor,
            type: IMatch.EnumRuleType.WORD,
            word: syn,
            _ranking: 0.95
        });
    });
}


function loadModelData(oMdl: IModel, sModelName: string, oModel: IModels) {
    // read the data ->
    // data is processed into mRules directly,
    var mdldata = fs.readFileSync('./sensitive/' + sModelName + ".data.json", 'utf-8');
    var oMdlData = JSON.parse(mdldata);
    oMdlData.forEach(function(oEntry) {
        if (!oEntry.tool) {
            oEntry.tool = oMdl.tool.name;
        }
        oMdl.wordindex.forEach(function(category) {
            if (oMdlData[category] !== "*") {
                var sString = oMdlData[category];
                oModel.mRules.push(
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
        mRules: []
    }
    var smdls = fs.readFileSync('./sensitive/models.json', 'utf-8');
    var mdls = JSON.parse("" + smdls);
    mdls.forEach(function(sModelName) {
        loadModel(sModelName, oModel)
    });

    // add the categories to the model:
    oModel.category.forEach(function(category) {
        oModel.mRules.push({
            category: "category",
            matchedString: category,
            type: IMatch.EnumRuleType.WORD,
            word: category,
            _ranking: 0.95
        });
    });
    return oModel;
}



function expandParametersInURL(oMergedContextResult) {
    var ptn = oMergedContextResult.result.pattern
    Object.keys(oMergedContextResult.context).forEach(function(sKey) {
        var regex = new RegExp('{' + sKey + '}', 'g')
        ptn = ptn.replace(regex, oMergedContextResult.context[sKey])
        ptn = ptn.replace(regex, oMergedContextResult.context[sKey])
    })
    return ptn
}


import * as inputFilterRules from '../match/inputFilterRules';

var toolExecutors = {
    "xFLP": {},
    "xFLPD": {},
    "unit test": function(match: IMatch.IToolMatch) {
        var unittest = match.toolmatchresult.required["unit test"].matchedString;
        var url = inputFilterRules.getUnitTestUrl(unittest);
        return {
            text: "starting unit test \"" + unittest + "\"" + (url ? (' with url ' + url) : 'no url :-('),
            action: { url: url }
        }
    },
    "wiki": function(match: IMatch.IToolMatch) {
        var wiki = match.toolmatchresult.required["wiki"].matchedString;
        var url = inputFilterRules.getWikiUrl(wiki);
        return {
            text: "starting wiki " + wiki + (url ? (' with url ' + url) : 'no url :-('),
            action: { url: url }
        }
    }
};

export function execTool(match: IMatch.IToolMatch, bExplain?: boolean): {
    text: string,
    action: any
} {
    //
    var exec = undefined;
    if (toolExecutors[match.tool.name]) {
        exec = toolExecutors[match.tool.name](match);

    }
    if (!exec) {
        exec = {
            text: "don't know how to execute " + match.tool.name + '\n'
        }
    }
    if (bExplain) {
        exec.text = exec.text + "\n" + Match.ToolMatch.dumpNice(match);
    }
    return exec;

    // TODO invoke tool specific starter
    /* if (oMergedContextResult.result.type === 'URL') {
      var ptn = expandParametersInURL(oMergedContextResult)
      startBrowser(ptn)
      return ptn
    } else {
      var s = ("Don't know how to start " + oMergedContextResult.result.type + '\n for "' + oMergedContextResult.query + '"')
      debuglog(s)
      return s
    }*/
}


//  executeStartup: executeStartup
//}
