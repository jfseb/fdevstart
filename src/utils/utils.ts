'use strict';
export function deepFreeze(o : any) {
  if (typeof o === "object") {
    Object.keys(o).forEach(function(sKey) {
      deepFreeze(o[sKey]);
    });
    Object.freeze(o);
  }
}


export function listToQuotedCommaWord(list : string[], quote : string, word: string) {
    quote = quote || "";
    if( list.length === 0) {
        return quote + quote;
    }
    var base = list.slice(0,list.length-1).join(quote + ", " + quote);
    if(base) {
        base = quote + base + quote + ' ' + word + ' ' + quote + list[list.length-1] + quote;
        return base;
    }
    return quote + list[0] + quote;
}

export function listToCommaAnd(list : string[], quote? : string) {
    return listToQuotedCommaWord(list,quote, 'and');
}
export function listToCommaOr(list : string[], quote? : string) {
    return  listToQuotedCommaWord(list,'', 'or');
}

export function listToQuotedCommaAnd(list : string[]) {
    return listToQuotedCommaWord(list,'"','and');
}
export function listToQuotedCommaOr(list : string[], quote? : string) {
    return  listToQuotedCommaWord(list,'"', 'or');
}


export function stripQuotes(str : string) : string {
    if(str.length > 2 && str.charAt(0) === '"' && str.charAt(str.length - 1) === '"') {
        return str.substring(1,str.length-1);
    }
    return str;
}

// courtesy of
// http://stackoverflow.com/questions/4459928/how-to-deep-clone-in-javascript
export function cloneDeep(item : any) : any  {
    if (!item) {
        return item;
    } // null, undefined values check
    var types = [Number, String, Boolean],
        result;
    // normalizing primitives if someone did new String('aaa'), or new Number('444');
    types.forEach(function (type) {
        if (item instanceof type) {
            result = type(item);
        }
    });
    if (typeof result == "undefined") {
        if (Object.prototype.toString.call(item) === "[object Array]") {
            result = [];
            item.forEach(function (child, index, array) {
                result[index] = cloneDeep(child);
            });
        } else if ((typeof item === 'undefined' ? 'undefined' : typeof item) == "object") {
            // testing that this is DOM
            if (!item.prototype) {
                if (item instanceof Date) {
                    result = new Date(item);
                } else {
                    // it is an object literal
                    result = {};
                    for (var i in item) {
                        result[i] = cloneDeep(item[i]);
                    }
               }
            } else {
                // depending what you would like here,
                //   // just keep the reference, or create new object
                //   if (false && item.constructor) {
                // would not advice to do that, reason? Read below
                //        result = new item.constructor();
                //    } else {
                result = item;
            }
        } else {
            result = item;
        }
    }
    return result;
}

type fna = (a : number,b : number) => number;

type fnComp<T> = (a : T,b : T) => boolean;


export const ArrayUtils = {

  indexOf : function<T>(oMember : T, aArr : Array<T>, fnComp : fnComp<T> ) : number {
    fnComp = fnComp || function (a:T, b:T) { return a === b };
    var resIndex = -1;
    aArr.every(function (oMemberArr, index) {
      var u = fnComp(oMemberArr,oMember);
      if(u) {
        resIndex = index;
        return false;
      }
      return true;
    });
    return resIndex;
  },

  presentIn : function<T>(oMember : T, aArr : Array<T>, fnComp? : fnComp<T> ) : boolean {
    return ArrayUtils.indexOf(oMember, aArr, fnComp) >= 0;
  },


  setMinus : function<T>(aRR1 : Array<T>, aRR2 : Array<T>, fnComp? : fnComp<T>)  {
    fnComp = fnComp || function (a:T, b:T) { return a === b };
    return  aRR1.reduce(function(Result, oMember, index) {
      if (!ArrayUtils.presentIn(oMember, aRR2, fnComp) && !ArrayUtils.presentIn(oMember, Result, fnComp)) {
        Result.push(oMember);
      }
      return Result;
    },[] as Array<T>);
  }
}
