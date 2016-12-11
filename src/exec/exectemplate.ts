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

const debuglog = debug('exectemplate')

import { exec } from 'child_process';

import * as IMatch from '../match/ifmatch';
import * as Match from '../match/match';


export function expandTemplate(context : {[key : string] : string} , template : string ) : string {
  var pattern = template;
  Object.keys(context).forEach(function (sKey) {
    var regex = new RegExp('{' + sKey + '}', 'g')
    pattern = pattern.replace(regex, context[sKey])
    pattern = pattern.replace(regex, context[sKey])
  })
  return pattern;
}

export function extractReplacementKeys(stemplate : string) : string[] {
  var regex = new RegExp('{([^}]+)}', "g");
  var keys = {};
  var m;
  while(m = regex.exec(stemplate)) {
    var pattern = m[1];
    keys[pattern] = 1;
  }
  return Object.keys(keys).sort();
}


