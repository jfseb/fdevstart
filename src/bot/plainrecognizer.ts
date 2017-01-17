
/**
 * @copyright (c) 2016 Gerd Forstmann
 * @file plainrecognizer.ts
 *
 * A recognizer parametrized by regex expressions
 */

import * as builder from 'botbuilder';
import * as InputFilter from '../match/inputFilter';
import * as IMatch from '../match/ifmatch';
import * as debug from 'debug';
const debuglog = debug('plainrecognizer');

const AnyObject = Object as any;

export function recognize(sString, mRules: Array<IMatch.IntentRule>) {
  var res = undefined;
  mRules.every(function (oRule) {
    res = matchRegularExpression(sString, oRule);
    return !res;
  })
  return res;
}

export function countParenGroups(s: string) {
  var res = 0;
  for (var i = 0; i < s.length; ++i) {
    if (s.charAt(i) === '(') {
      ++res;
    }
  }
  return res;
}

/**
 * given a string, e.g.
 * "who is the <category> of <A1>",
 * @param {string} a
 * @returns {IMatch.IRule} a regexp rule
 */
export function parseRuleString(a: string): IMatch.IntentRule {
  var s = "^" + a + "$";
  var argMaps = {};
  var m = undefined;
  while (m = /<([^>]+)>([?]?)/.exec(s)) {
    var cat = m[1];
    var greedy = m[2];
    var pos = 1 + countParenGroups(s.substring(0, m.index));
    if(greedy) {
      s = s.replace("<" + cat + ">?", "(.*?)");
    } else {
        s = s.replace("<" + cat + ">", "(.*)");
      }
    if (argMaps[cat]) {
      throw Error("Model error duplicate entry!")
    }
    argMaps[cat] = pos;
  }
  return {
    type: 1,
    regexp: new RegExp(s, "i"),
    argsMap: argMaps
  };
}


/**
 * given a string, e.g.
 * "who is the <category> of <A1>",
 * @param {string} a
 * @returns {IMatch.IRule} a regexp rule
 */
export function parseRuleArray(a: Array<any>): IMatch.IntentRule {
  var s = "^" + a + "$";
  var r = a[0];
  if(typeof a[0] === "string") {
    r = new RegExp(a[0],"i");
  }
  if (!(r instanceof RegExp)) {
    throw Error("illegal state" + JSON.stringify(a));
  }
  return {
    type: 1,
    regexp: r,
    argsMap: a[1]
  };
}


export function parseRule(a: any): IMatch.IntentRule {
  if (typeof a === 'string') {
    return parseRuleString(a);
  } else if (Array.isArray(a)) {
    return parseRuleArray(a);
  }
  throw new Error("unknown rule definition");
}

export function parseRules(oJSON: { [key: string]: any }): { [key: string]: Array<IMatch.IntentRule> } {
  var res = {};
  Object.keys(oJSON).forEach(function (sKey) {
    res[sKey] = oJSON[sKey].map(function (oRule) {
      return parseRule(oRule);
    })
  });
  return res;
};

export function trimValueAdjusting(value : string) : { deltaStart :number, value : string} {
  var res = { deltaStart : 0, value : value };
  var m = value.match(/^\s+/);
  if(m) {
    res.deltaStart = m[0].length;
    value = value.substr(res.deltaStart);
  }
  m = value.match(/\s+$/);
  if(m) {
    value = value.substr(0, value.length - m[0].length);
  }
  res.value = value;
  return res;

}

export function extractArgsMap(s : string, match: Array<string>, argsMap: { [key: string]: number }): Array<builder.IEntity> {
  if (!argsMap) {
    return [];
  }
  var result = [];
  Object.keys(argsMap).forEach(function (sKey) {
    var res = {} as builder.IEntity;
    var index = argsMap[sKey];
    var value = match[index]
    if ((typeof value === "string") && value.length > 0) {
      res.type = sKey;
      res.entity = value;
      res.startIndex = s.indexOf(value); // this may not be precise
      var trimAdjust = trimValueAdjusting(value);
      res.startIndex += trimAdjust.deltaStart;
      res.entity = trimAdjust.value;
      res.endIndex = res.startIndex + trimAdjust.value.length;
      //res[sKey] = value
      result.push(res);
    }
  }
  );
  return result;
}

export function matchRegularExpression(text : string, oRule : IMatch.IntentRule) : builder.IIntentRecognizerResult {
  debuglog("regexp is " + oRule.regexp.toString());
  debuglog(" text is " + text);
  var m = oRule.regexp.exec(text);
  if (!m) {
    return undefined;
  }
  var res = {} as builder.IIntentRecognizerResult;
  res.entities = extractArgsMap(text, m, oRule.argsMap);
  res.score = 0.9;
  debuglog("match " + JSON.stringify(m));
  debuglog('Found one' + JSON.stringify(res, undefined, 2));
  return res;
}


export function trimTrailingSentenceDelimiters(text : string) : string {
  var m = /([!.;, ?]|\s)+$/.exec(text);
  if (m) {
    text = text.substr(0,text.length- m[0].length);
  }
  return text;
}

export function recognizeText(text : string, aRules : Array<IMatch.IntentRule>) : builder.IIntentRecognizerResult{
    var res = undefined;
    var textStripped = trimTrailingSentenceDelimiters(text);
    aRules.every(function (oRule) {
        res = matchRegularExpression(textStripped, oRule);
        return !res;
    });
    return res;
}

export class RegExpRecognizer implements builder.IIntentRecognizer {
  oRules: { [key: string]: Array<IMatch.IntentRule> };

  constructor(xRules: { [key: string]: Array<IMatch.IntentRule> }) {
    this.oRules = xRules;
    debuglog("rules " + JSON.stringify(this.oRules));
  };

  recognize(context: builder.IRecognizeContext, callback: (err: Error, result: builder.IIntentRecognizerResult) => void): void {
    var u = {} as builder.IIntentRecognizerResult;
    var text = context.message.text;
    var that = this;
    debuglog("rules " + JSON.stringify(this.oRules));
    var results = Object.keys(this.oRules).map(function (sKey) {
      var u = recognizeText(text, that.oRules[sKey]);
      if (u) {
        u.intent = sKey;
      }
      return u ?  u : undefined;
    }).filter(function (o) { return !!o; });
    if (results.length > 1) {
      /* TODO abiguous */
      debuglog("ambiguous result for >" + text + "<" + JSON.stringify(res));
    }
    if (results.length > 0) {
      var res = results[0];
      callback(undefined, res);
      return;
    }
    debuglog('recognizing nothing');
    u.intent = "None";
    u.score = 0.1;
    var e1 = {} as builder.IEntity;
    e1.startIndex = "exit ".length;
    e1.endIndex = context.message.text.length;
    e1.score = 0.1;
    u.entities = [];
    callback(undefined, u);
  }
} // class



