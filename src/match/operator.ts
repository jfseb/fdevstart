/**
 * @file operator
 * @module jfseb.fdevstart.sentence
 * @copyright (c) Gerd Forstmann
 *
 * Operator implementation
 *
 * These functions expose parf the underlying model,
 *
 */

// <reference path="../../lib/node-4.d.ts" />

// import * as debug from 'debug';

// import * as utils from '../utils/utils';

import * as IMatch from './ifmatch';





/**
 * Note: both arguments are expected to be lowercased
 */
export function matches(operator : IMatch.IOperator, fragmentLC : string, strLC : string)  : boolean {
  if(!strLC) {
    return false;
  }
  switch(operator.operator) {
    case "starting with":
      return strLC.indexOf(fragmentLC) === 0;
    case "containing":
      return strLC.indexOf(fragmentLC) >= 0;
    case "ending with":
      return strLC.length >= fragmentLC.length &&
        strLC.substring(strLC.length - fragmentLC.length) === fragmentLC;
    default:
      throw new Error('Unknown operator or illegal operator usage: ' + operator.operator);
  }
  //return false;
}
