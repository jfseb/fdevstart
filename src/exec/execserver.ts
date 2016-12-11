/**
 * Functionality to execute a certain response on the server,
 * interpreting a general model context
 *
 *
 * via a) commandline (e.g. browser startup)
 * @file
 * @copyright (c) 2016 Gerd Forstmann
 */

import * as intf from 'constants';

import * as debug from 'debug';

import *  as IFMatch from '../match/ifmatch';

const debuglog = debug('execserver')

import { exec } from 'child_process';

import * as IMatch from '../match/ifmatch';
import * as Match from '../match/match';


import * as inputFilterRules from '../match/inputFilterRules';


var toolExecutors = {
  "xFLP": {},
  "xFLPD": {},
  "unit test": function (match: IFMatch.IToolMatch) {
    var unittest = match.toolmatchresult.required["unit test"].matchedString;
    var url = inputFilterRules.getUnitTestUrl(unittest);
    return {
      text: "starting unit test \"" + unittest + "\"" + (url ? (' with url ' + url) : 'no url :-('),
      action: { url: url }
    }
  },
  "wiki": function (match: IFMatch.IToolMatch) {
    var wiki = match.toolmatchresult.required["wiki"].matchedString;
    var url = inputFilterRules.getWikiUrl(wiki);
    return {
      text: "starting wiki " + wiki + (url ? (' with url ' + url) : 'no url :-('),
      action: { url: url }
    }
  }
};

import * as Toolmatch from '../match/toolmatch';

import * as Exectemplate from './exectemplate';

export function noStar(a: string, b: string) {
  if (b === '*') {
    return a;
  }
  if (a === '*') {
    return b;
  }
  if (a !== b) {
    throw new Error('Illegal Argument no match ' + a + " " + b);
  }
  return b;
}

export function makeGenericText(match: IMatch.IToolMatch, setId: string, record: IMatch.IRecord): string {
  var res = "start " + match.tool.name;
  var set = match.tool.sets[setId];
  var context = Toolmatch.makeMatchSet(match, set);
  set.set.forEach(function (category, index) {
    var value = noStar(context[category], record[category]);
    var prefix = "";
    if (index === 0) {
      prefix += ' using ';
    } else if (index === set.set.length - 1) {
      prefix += ' and ';
    } else {
      prefix = '; ';
    }
    if (category === "category") {
      res = res + prefix +'"' + value + '"';
    }
    res = res + prefix + category + ' "' + value  + '"';
  });
  return res;
}

export function execTool(match: IMatch.IToolMatch, records: IMatch.IRecord[], bExplain?: boolean ): {
  text: string,
  action: any
} {
  //
  var matchSetRecord = Toolmatch.findFirstSetRecord(match, records);
  var set = match.tool.sets[matchSetRecord.setId];
  var pattern = matchSetRecord.record[set.response];

  var context = Toolmatch.makeMatchSet(match, set);
  var url = Exectemplate.expandTemplate(context, pattern);
  var text = "";
  debuglog("record " +JSON.stringify("matchSetRecord "));
  var patternText = matchSetRecord.record["_text" + set.response];
  if (patternText) {
    text = Exectemplate.expandTemplate(context, patternText);
  } else {
    text = makeGenericText(match, matchSetRecord.setId, matchSetRecord.record)
  }
  return {
    text: text,
    action: { url: url }
  }
}
