"use strict";
/**
 * Functionality to execute a certain response
 *
 * via a) commandline (e.g. browser startup)
 * @file
 */
Object.defineProperty(exports, "__esModule", { value: true });
const debug = require("debug");
const IFMatch = require("../match/ifmatch");
const debuglog = debug('dispatcher');
const child_process_1 = require("child_process");
const Match = require("../match/match");
var EnumResponseCode;
(function (EnumResponseCode) {
    EnumResponseCode[EnumResponseCode["NOMATCH"] = 0] = "NOMATCH";
    EnumResponseCode[EnumResponseCode["EXEC"] = 1] = "EXEC";
    EnumResponseCode[EnumResponseCode["QUERY"] = 2] = "QUERY";
})(EnumResponseCode = exports.EnumResponseCode || (exports.EnumResponseCode = {}));
/**
 * Defines the interface for an analysis
 * reponse
 */
/*
export interface IResponse {
  rating : number,
  type : EnumResponseCode,
  query : string,
  context : { [key:string] :string},
  text : string,
  action : IAction,
  prompts : { [key :string ] : { text : string, description : any }; }


export const enum EnumActionType {
  STARTURL,
  STARTCMDLINE
}

export interface IAction {
  data : any,
  type : EnumActionType,
  pattern : string,
  concrete : string
}
}*/
//var exec = require('child_process').exec
function startBrowser(oUrlAction) {
    var cmd = '"%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --incognito -url "' + oUrlAction.concrete + '"';
    child_process_1.exec(cmd, function (error, stdout, stderr) {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
    });
}
function startCommandLine(scmd) {
    var cmd = scmd.concrete;
    child_process_1.exec(cmd, function (error, stdout, stderr) {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
    });
}
function expandContextIntoAction(oResult) {
    var pattern = oResult.action.pattern;
    Object.keys(oResult.context).forEach(function (sKey) {
        var regex = new RegExp('{' + sKey + '}', 'g');
        pattern = pattern.replace(regex, oResult.context[sKey]);
        pattern = pattern.replace(regex, oResult.context[sKey]);
    });
    oResult.action.concrete = pattern;
    return pattern;
}
exports.expandContextIntoAction = expandContextIntoAction;
/**
 * execute some starupt
 *
 */
function executeStartup(oResult, cb) {
    if (oResult.type !== 1 /* EXEC */) {
        return;
    }
    var action = oResult.action;
    if (oResult.action.type === 0 /* STARTURL */) {
        //var ptn = expandParametersInURL(oResult)
        startBrowser(action);
        return action.concrete;
    }
    else if (oResult.action.type === 1 /* STARTCMDLINE */) {
        startCommandLine(action);
    }
    else {
        var s = ("Don't know how to start " + oResult.type + '\n for "' + oResult.query + '"');
        console.error(s);
        return s;
    }
}
function expandParametersInURL(oMergedContextResult) {
    var ptn = oMergedContextResult.result.pattern;
    Object.keys(oMergedContextResult.context).forEach(function (sKey) {
        var regex = new RegExp('{' + sKey + '}', 'g');
        ptn = ptn.replace(regex, oMergedContextResult.context[sKey]);
        ptn = ptn.replace(regex, oMergedContextResult.context[sKey]);
    });
    return ptn;
}
const inputFilterRules = require("../match/inputFilterRules");
var toolExecutors = {
    "xFLP": {},
    "xFLPD": {},
    "unit test": function (match) {
        var unittest = match.toolmatchresult.required["unit test"].matchedString;
        var url = inputFilterRules.getUnitTestUrl(unittest);
        return {
            text: "starting unit test \"" + unittest + "\"" + (url ? (' with url ' + url) : 'no url :-('),
            action: { url: url }
        };
    },
    "wiki": function (match) {
        var wiki = match.toolmatchresult.required["wiki"].matchedString;
        var url = inputFilterRules.getWikiUrl(wiki);
        return {
            text: "starting wiki " + wiki + (url ? (' with url ' + url) : 'no url :-('),
            action: { url: url }
        };
    }
};
function execTool(match, bExplain) {
    //
    var exec = undefined;
    if (toolExecutors[match.tool.name]) {
        exec = toolExecutors[match.tool.name](match);
    }
    if (!exec) {
        exec = {
            text: "don't know how to execute " + match.tool.name + '\n'
        };
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
exports.execTool = execTool;
//  executeStartup: executeStartup
//}

//# sourceMappingURL=exec.js.map
