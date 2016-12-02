'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function deepFreeze(o) {
    if ((typeof o === "undefined" ? "undefined" : _typeof(o)) === "object") {
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
        } else if ((typeof item === 'undefined' ? 'undefined' : typeof item === "undefined" ? "undefined" : _typeof(item)) == "object") {
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
exports.cloneDeep = cloneDeep;
exports.ArrayUtils = {
    indexOf: function indexOf(oMember, aArr, fnComp) {
        fnComp = fnComp || function (a, b) {
            return a === b;
        };
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
    presentIn: function presentIn(oMember, aArr, fnComp) {
        return exports.ArrayUtils.indexOf(oMember, aArr, fnComp) >= 0;
    },
    setMinus: function setMinus(aRR1, aRR2, fnComp) {
        fnComp = fnComp || function (a, b) {
            return a === b;
        };
        return aRR1.reduce(function (Result, oMember, index) {
            if (!exports.ArrayUtils.presentIn(oMember, aRR2, fnComp) && !exports.ArrayUtils.presentIn(oMember, Result, fnComp)) {
                Result.push(oMember);
            }
            return Result;
        }, []);
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy91dGlscy50cyJdLCJuYW1lcyI6WyJkZWVwRnJlZXplIiwibyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwic0tleSIsImZyZWV6ZSIsImV4cG9ydHMiLCJjbG9uZURlZXAiLCJpdGVtIiwidHlwZXMiLCJOdW1iZXIiLCJTdHJpbmciLCJCb29sZWFuIiwicmVzdWx0IiwidHlwZSIsInByb3RvdHlwZSIsInRvU3RyaW5nIiwiY2FsbCIsImNoaWxkIiwiaW5kZXgiLCJhcnJheSIsIkRhdGUiLCJpIiwiQXJyYXlVdGlscyIsImluZGV4T2YiLCJvTWVtYmVyIiwiYUFyciIsImZuQ29tcCIsImEiLCJiIiwicmVzSW5kZXgiLCJldmVyeSIsIm9NZW1iZXJBcnIiLCJ1IiwicHJlc2VudEluIiwic2V0TWludXMiLCJhUlIxIiwiYVJSMiIsInJlZHVjZSIsIlJlc3VsdCIsInB1c2giXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBQ0EsU0FBQUEsVUFBQSxDQUEyQkMsQ0FBM0IsRUFBa0M7QUFDaEMsUUFBSSxRQUFPQSxDQUFQLHlDQUFPQSxDQUFQLE9BQWEsUUFBakIsRUFBMkI7QUFDekJDLGVBQU9DLElBQVAsQ0FBWUYsQ0FBWixFQUFlRyxPQUFmLENBQXVCLFVBQVNDLElBQVQsRUFBYTtBQUNsQ0wsdUJBQVdDLEVBQUVJLElBQUYsQ0FBWDtBQUNELFNBRkQ7QUFHQUgsZUFBT0ksTUFBUCxDQUFjTCxDQUFkO0FBQ0Q7QUFDRjtBQVBlTSxRQUFBUCxVQUFBLEdBQVVBLFVBQVY7QUFVaEI7QUFDQTtBQUNBLFNBQUFRLFNBQUEsQ0FBMEJDLElBQTFCLEVBQW9DO0FBQ2hDLFFBQUksQ0FBQ0EsSUFBTCxFQUFXO0FBQ1AsZUFBT0EsSUFBUDtBQUNILEtBSCtCLENBRzlCO0FBQ0YsUUFBSUMsUUFBUSxDQUFDQyxNQUFELEVBQVNDLE1BQVQsRUFBaUJDLE9BQWpCLENBQVo7QUFBQSxRQUNJQyxNQURKO0FBRUE7QUFDQUosVUFBTU4sT0FBTixDQUFjLFVB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QyxDQUFyRCxFQUFvRztBQUNsR1ksdUJBQU9DLElBQVAsQ0FBWWYsT0FBWjtBQUNEO0FBQ0QsbUJBQU9jLE1BQVA7QUFDRCxTQUxPLEVBS04sRUFMTSxDQUFSO0FBTUQ7QUEvQnVCLENBQWIiLCJmaWxlIjoidXRpbHMvdXRpbHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5leHBvcnQgZnVuY3Rpb24gZGVlcEZyZWV6ZShvIDogYW55KSB7XG4gIGlmICh0eXBlb2YgbyA9PT0gXCJvYmplY3RcIikge1xuICAgIE9iamVjdC5rZXlzKG8pLmZvckVhY2goZnVuY3Rpb24oc0tleSkge1xuICAgICAgZGVlcEZyZWV6ZShvW3NLZXldKTtcbiAgICB9KTtcbiAgICBPYmplY3QuZnJlZXplKG8pO1xuICB9XG59XG5cblxuLy8gY291cnRlc3kgb2Zcbi8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNDQ1OTkyOC9ob3ctdG8tZGVlcC1jbG9uZS1pbi1qYXZhc2NyaXB0XG5leHBvcnQgZnVuY3Rpb24gY2xvbmVEZWVwKGl0ZW0gOiBhbnkpIDogYW55ICB7XG4gICAgaWYgKCFpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIH0gLy8gbnVsbCwgdW5kZWZpbmVkIHZhbHVlcyBjaGVja1xuICAgIHZhciB0eXBlcyA9IFtOdW1iZXIsIFN0cmluZywgQm9vbGVhbl0sXG4gICAgICAgIHJlc3VsdDtcbiAgICAvLyBub3JtYWxpemluZyBwcmltaXRpdmVzIGlmIHNvbWVvbmUgZGlkIG5ldyBTdHJpbmcoJ2FhYScpLCBvciBuZXcgTnVtYmVyKCc0NDQnKTtcbiAgICB0eXBlcy5mb3JFYWNoKGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgdHlwZSkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdHlwZShpdGVtKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGlmICh0eXBlb2YgcmVzdWx0ID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpdGVtKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBbXTtcbiAgICAgICAgICAgIGl0ZW0uZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQsIGluZGV4LCBhcnJheSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdFtpbmRleF0gPSBjbG9uZURlZXAoY2hpbGQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoKHR5cGVvZiBpdGVtID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogdHlwZW9mIGl0ZW0pID09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIC8vIHRlc3RpbmcgdGhhdCB0aGlzIGlzIERPTVxuICAgICAgICAgICAgaWYgKCFpdGVtLnByb3RvdHlwZSkge1xuICAgICAgICAgICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgRGF0ZShpdGVtKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBpdCBpcyBhbiBvYmplY3QgbGl0ZXJhbFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRbaV0gPSBjbG9uZURlZXAoaXRlbVtpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gZGVwZW5kaW5nIHdoYXQgeW91IHdvdWxkIGxpa2UgaGVyZSxcbiAgICAgICAgICAgICAgICAvLyAgIC8vIGp1c3Qga2VlcCB0aGUgcmVmZXJlbmNlLCBvciBjcmVhdGUgbmV3IG9iamVjdFxuICAgICAgICAgICAgICAgIC8vICAgaWYgKGZhbHNlICYmIGl0ZW0uY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICAvLyB3b3VsZCBub3QgYWR2aWNlIHRvIGRvIHRoYXQsIHJlYXNvbj8gUmVhZCBiZWxvd1xuICAgICAgICAgICAgICAgIC8vICAgICAgICByZXN1bHQgPSBuZXcgaXRlbS5jb25zdHJ1Y3RvcigpO1xuICAgICAgICAgICAgICAgIC8vICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gaXRlbTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGl0ZW07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxudHlwZSBmbmEgPSAoYSA6IG51bWJlcixiIDogbnVtYmVyKSA9PiBudW1iZXI7XG5cbnR5cGUgZm5Db21wPFQ+ID0gKGEgOiBULGIgOiBUKSA9PiBib29sZWFuO1xuXG5cbmV4cG9ydCBjb25zdCBBcnJheVV0aWxzID0ge1xuXG5cblxuICBpbmRleE9mIDogZnVuY3Rpb248VD4ob01lbWJlciA6IFQsIGFBcnIgOiBBcnJheTxUPiwgZm5Db21wIDogZm5Db21wPFQ+ICkgOiBudW1iZXIge1xuICAgIGZuQ29tcCA9IGZuQ29tcCB8fCBmdW5jdGlvbiAoYTpULCBiOlQpIHsgcmV0dXJuIGEgPT09IGIgfTtcbiAgICB2YXIgcmVzSW5kZXggPSAtMTtcbiAgICBhQXJyLmV2ZXJ5KGZ1bmN0aW9uIChvTWVtYmVyQXJyLCBpbmRleCkge1xuICAgICAgdmFyIHUgPSBmbkNvbXAob01lbWJlckFycixvTWVtYmVyKTtcbiAgICAgIGlmKHUpIHtcbiAgICAgICAgcmVzSW5kZXggPSBpbmRleDtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc0luZGV4O1xuICB9LFxuXG4gIHByZXNlbnRJbiA6IGZ1bmN0aW9uPFQ+KG9NZW1iZXIgOiBULCBhQXJyIDogQXJyYXk8VD4sIGZuQ29tcD8gOiBmbkNvbXA8VD4gKSA6IGJvb2xlYW4ge1xuICAgIHJldHVybiBBcnJheVV0aWxzLmluZGV4T2Yob01lbWJlciwgYUFyciwgZm5Db21wKSA+PSAwO1xuICB9LFxuXG5cbiAgc2V0TWludXMgOiBmdW5jdGlvbjxUPihhUlIxIDogQXJyYXk8VD4sIGFSUjIgOiBBcnJheTxUPiwgZm5Db21wPyA6IGZuQ29tcDxUPikgIHtcbiAgICBmbkNvbXAgPSBmbkNvbXAgfHwgZnVuY3Rpb24gKGE6VCwgYjpUKSB7IHJldHVybiBhID09PSBiIH07XG4gICAgcmV0dXJuICBhUlIxLnJlZHVjZShmdW5jdGlvbihSZXN1bHQsIG9NZW1iZXIsIGluZGV4KSB7XG4gICAgICBpZiAoIUFycmF5VXRpbHMucHJlc2VudEluKG9NZW1iZXIsIGFSUjIsIGZuQ29tcCkgJiYgIUFycmF5VXRpbHMucHJlc2VudEluKG9NZW1iZXIsIFJlc3VsdCwgZm5Db21wKSkge1xuICAgICAgICBSZXN1bHQucHVzaChvTWVtYmVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBSZXN1bHQ7XG4gICAgfSxbXSBhcyBBcnJheTxUPik7XG4gIH1cbn1cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
