/**
 * Functionality to execute a certain response
 *
 * via a) commandline (e.g. browser startup)
 * @file
 */
"use strict";
var debug = require('debug');
var IFMatch = require('../match/ifmatch');
var debuglog = debug('dispatcher');
var child_process_1 = require('child_process');
(function (EnumResponseCode) {
    EnumResponseCode[EnumResponseCode["NOMATCH"] = 0] = "NOMATCH";
    EnumResponseCode[EnumResponseCode["EXEC"] = 1] = "EXEC";
    EnumResponseCode[EnumResponseCode["QUERY"] = 2] = "QUERY";
})(exports.EnumResponseCode || (exports.EnumResponseCode = {}));
var EnumResponseCode = exports.EnumResponseCode;
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
            console.error("exec error: " + error);
            return;
        }
        console.log("stdout: " + stdout);
        console.log("stderr: " + stderr);
    });
}
function startCommandLine(scmd) {
    var cmd = scmd.concrete;
    child_process_1.exec(cmd, function (error, stdout, stderr) {
        if (error) {
            console.error("exec error: " + error);
            return;
        }
        console.log("stdout: " + stdout);
        console.log("stderr: " + stderr);
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
module.exports = {
    executeStartup: executeStartup
};

//# sourceMappingURL=exec.js.map
