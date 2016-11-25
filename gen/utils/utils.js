'use strict';
function deepFreeze(o) {
    if (typeof o === "object") {
        Object.keys(o).forEach(function (sKey) {
            deepFreeze(o[sKey]);
        });
        Object.freeze(o);
    }
}
exports.deepFreeze = deepFreeze;
// courtesy of
// http://stackoverflow.com/questions/4459928/how-to-deep-clone-in-javascript
function cloneDeep(item) {
    if (!item) {
        return item;
    } // null, undefined values check
    var types = [Number, String, Boolean], result;
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
        }
        else if ((typeof item === 'undefined' ? 'undefined' : typeof item) == "object") {
            // testing that this is DOM
            if (!item.prototype) {
                if (item instanceof Date) {
                    result = new Date(item);
                }
                else {
                    // it is an object literal
                    result = {};
                    for (var i in item) {
                        result[i] = cloneDeep(item[i]);
                    }
                }
            }
            else {
                // depending what you would like here,
                //   // just keep the reference, or create new object
                //   if (false && item.constructor) {
                // would not advice to do that, reason? Read below
                //        result = new item.constructor();
                //    } else {
                result = item;
            }
        }
        else {
            result = item;
        }
    }
    return result;
}
exports.cloneDeep = cloneDeep;
exports.ArrayUtils = {
    indexOf: function (oMember, aArr, fnComp) {
        fnComp = fnComp || function (a, b) { return a === b; };
        var resIndex = -1;
        aArr.every(function (oMemberArr, index) {
            var u = fnComp(oMemberArr, oMember);
            if (u) {
                resIndex = index;
                return false;
            }
            return true;
        });
        return resIndex;
    },
    presentIn: function (oMember, aArr, fnComp) {
        return exports.ArrayUtils.indexOf(oMember, aArr, fnComp) >= 0;
    },
    setMinus: function (aRR1, aRR2, fnComp) {
        fnComp = fnComp || function (a, b) { return a === b; };
        return aRR1.reduce(function (Result, oMember, index) {
            if (!exports.ArrayUtils.presentIn(oMember, aRR2, fnComp) && !exports.ArrayUtils.presentIn(oMember, Result, fnComp)) {
                Result.push(oMember);
            }
            return Result;
        }, []);
    }
};

//# sourceMappingURL=utils.js.map
