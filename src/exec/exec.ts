/**
 * Functionality to execute a certain response
 *
 * via a) commandline (e.g. browser startup)
 * @file
 */

import * as intf from 'constants';

import * as debug from 'debug';

import *  as IFMatch from '../match/ifmatch';

const debuglog = debug('dispatcher')

import { exec } from 'child_process';

import * as IMatch from '../match/ifmatch';
import * as Match from '../match/match';


export const enum EnumResponseCode {
  NOMATCH = 0,
  EXEC,
  QUERY
}

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

function startBrowser (oUrlAction : IFMatch.IAction) {
  var cmd =
  '"%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --incognito -url "' + oUrlAction.concrete + '"'
  exec(cmd, function (error, stdout, stderr) {
    if (error) {
      console.error(`exec error: ${error}`)
      return
    }
    console.log(`stdout: ${stdout}`)
    console.log(`stderr: ${stderr}`)
  })
}

function startCommandLine (scmd : IFMatch.IAction) {
  var cmd = scmd.concrete;
  exec(cmd, function (error, stdout, stderr) {
    if (error) {
      console.error(`exec error: ${error}`)
      return
    }
    console.log(`stdout: ${stdout}`)
    console.log(`stderr: ${stderr}`)
  })
}


export function expandContextIntoAction (oResult : IFMatch.IResponse) {
  var pattern = oResult.action.pattern
  Object.keys(oResult.context).forEach(function (sKey) {
    var regex = new RegExp('{' + sKey + '}', 'g')
    pattern = pattern.replace(regex, oResult.context[sKey])
    pattern = pattern.replace(regex, oResult.context[sKey])
  })
  oResult.action.concrete = pattern;
  return pattern
}

/**
 * execute some starupt
 *
 */
function executeStartup (oResult: IFMatch.IResponse, cb: (err : any, a : IFMatch.IResponse) => string) {
  if (oResult.type !== IFMatch.EnumResponseCode.EXEC) {
    return
  }
  var action = oResult.action;
  if(oResult.action.type === IFMatch.EnumActionType.STARTURL) {
    //var ptn = expandParametersInURL(oResult)
    startBrowser(action)
    return action.concrete
  } else if(oResult.action.type === IFMatch.EnumActionType.STARTCMDLINE) {
    startCommandLine(action);
  } else {
    var s = ("Don't know how to start " + oResult.type + '\n for "' + oResult.query + '"')
    console.error(s)
    return s
  }
}


  function expandParametersInURL (oMergedContextResult) {
    var ptn = oMergedContextResult.result.pattern
    Object.keys(oMergedContextResult.context).forEach(function (sKey) {
      var regex = new RegExp('{' + sKey + '}', 'g')
      ptn = ptn.replace(regex, oMergedContextResult.context[sKey])
      ptn = ptn.replace(regex, oMergedContextResult.context[sKey])
    })
    return ptn
  }

export function execTool(match: IMatch.IToolMatch) : string {
    return "can execute" + match.tool.name + " " +
    Match.ToolMatch.dumpNice(match);

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
