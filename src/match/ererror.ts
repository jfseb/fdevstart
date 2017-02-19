/**
 *
 * @module jfseb.fdevstart.analyze
 * @file erbase
 * @copyright (c) 2016 Gerd Forstmann
 *
 * Basic domain based entity recognition
 */


import * as InputFilter from './inputFilter';

import * as debug from 'debug';

const debuglog = debug('erbase');
const debuglogV = debug('erbase');
const perflog = debug('perf');

const AnyObject = <any>Object;


import * as Utils from 'abot_utils';

import * as IMatch from './ifmatch';

export function makeError_NO_KNOWN_WORD(index : number, tokens : string[]) :IMatch.IERErrorNO_KNOWN_WORD {
    if(index < 0 || index >= tokens.length) {
      throw Error("invalid index in Error construction " + index + "tokens.lenth=" + tokens.length);
    }
  return {
    err_code: IMatch.ERR_NO_KNOWN_WORD,
    text : `I do not understand "${tokens[index]}".`,
    context : {
      tokens: tokens,
      token : tokens[index],
      index : index
    }
  } as IMatch.IERErrorNO_KNOWN_WORD;
}


export function makeError_EMPTY_INPUT( ) :IMatch.IERError {
  return {
    err_code: IMatch.ERR_EMPTY_INPUT,
    text : `I did not get an input.`,
  } as IMatch.IERError;
}

export function explainError(errors : IMatch.IERError[]) {
  if(errors.length) {
    return "\n" + errors.map(err => err.text).join("\n");
  }
  return;
}