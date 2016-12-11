/**
 * @file toolmatcher
 * @module jfseb.fdevstart.toolmatcher
 * @copyright (c) Gerd Forstmann
 *
 * Match a tool record on a sentence,
 *
 * This will unify matching required and optional category words
 * with the requirements of the tool.
 *
 */

// / <reference path="../../lib/node-4.d.ts" />

import * as debug from 'debug';
import * as IMatch from './ifmatch';



var oToolFLPD = {
  'name': 'FLPD',
  'requires': { 'systemId': {}, 'client': {} },
  'optional': { 'fiori catalog': {}, 'fiori group': {} }
};

var oToolFLP = {
  'name': 'FLP',
  'requires': { 'systemId': {}, 'client': {} },
  "optional": {
    "fiori intent": {}
  },
  "sets": {
    "intent": {
      "set": [
        "systemId",
        "client",
        "fiori intent"
      ],
      "response": "_urlpattern1"
    },
    "none": {
      "set": [
        "systemId",
        "client"
      ],
      "response": "_urlpattern2"
    }
  }
};

var oToolTA = {
  'name': 'StartTA',
  'requires': { 'transaction': {}, 'systemId': {}, 'client': {} },
  'optional': {}
};

var oToolWiki = {
  'name': 'wiki',
  'requires': { 'wiki': {} },
  'optional': { 'wikipage': {} }
};


var oToolUnitTest = {
  'name': 'unit test',
  'requires': { 'unit test': {} },
  optional: {}
};


const tools = [oToolWiki, oToolTA, oToolUnitTest, oToolFLPD, oToolFLP];

export function cmpTools(a: IMatch.ITool, b: IMatch.ITool) {
  return a.name.localeCompare(b.name);
}

export function getTools() {
  return tools.sort(cmpTools);
};


export function findMatchingSet(a : Array<IMatch.IToolMatch> ) {

}