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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy91dGlscy50cyJdLCJuYW1lcyI6WyJkZWVwRnJlZXplIiwibyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwic0tleSIsImZyZWV6ZSIsImV4cG9ydHMiLCJjbG9uZURlZXAiLCJpdGVtIiwidHlwZXMiLCJOdW1iZXIiLCJTdHJpbmciLCJCb29sZWFuIiwicmVzdWx0IiwidHlwZSIsInByb3RvdHlwZSIsInRvU3RyaW5nIiwiY2FsbCIsImNoaWxkIiwiaW5kZXgiLCJhcnJheSIsIkRhdGUiLCJpIiwiQXJyYXlVdGlscyIsImluZGV4T2YiLCJvTWVtYmVyIiwiYUFyciIsImZuQ29tcCIsImEiLCJiIiwicmVzSW5kZXgiLCJldmVyeSIsIm9NZW1iZXJBcnIiLCJ1IiwicHJlc2VudEluIiwic2V0TWludXMiLCJhUlIxIiwiYVJSMiIsInJlZHVjZSIsIlJlc3VsdCIsInB1c2giXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBQ0EsU0FBQUEsVUFBQSxDQUEyQkMsQ0FBM0IsRUFBa0M7QUFDaEMsUUFBSSxRQUFPQSxDQUFQLHlDQUFPQSxDQUFQLE9BQWEsUUFBakIsRUFBMkI7QUFDekJDLGVBQU9DLElBQVAsQ0FBWUYsQ0FBWixFQUFlRyxPQUFmLENBQXVCLFVBQVNDLElBQVQsRUFBYTtBQUNsQ0wsdUJBQVdDLEVBQUVJLElBQUYsQ0FBWDtBQUNELFNBRkQ7QUFHQUgsZUFBT0ksTUFBUCxDQUFjTCxDQUFkO0FBQ0Q7QUFDRjtBQVBlTSxRQUFBUCxVQUFBLEdBQVVBLFVBQVY7QUFVaEI7QUFDQTtBQUNBLFNBQUFRLFNBQUEsQ0FBMEJDLElBQTFCLEVBQW9DO0FBQ2hDLFFBQUksQ0FBQ0EsSUFBTCxFQUFXO0FBQ1AsZUFBT0EsSUFBUDtBQUNILEtBSCtCLENBRzlCO0FBQ0YsUUFBSUMsUUFBUSxDQUFDQyxNQUFELEVBQVNDLE1BQVQsRUFBaUJDLE9BQWpCLENBQVo7QUFBQSxRQUNJQyxNQURKO0FBRUE7QUFDQUosVUFBTU4sT0FBTixDQUFjLFVB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LENBQXJELEVBQW9HO0FBQ2xHWSx1QkFBT0MsSUFBUCxDQUFZZixPQUFaO0FBQ0Q7QUFDRCxtQkFBT2MsTUFBUDtBQUNELFNBTE8sRUFLTixFQUxNLENBQVI7QUFNRDtBQTdCdUIsQ0FBYiIsImZpbGUiOiJ1dGlscy91dGlscy5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbmV4cG9ydCBmdW5jdGlvbiBkZWVwRnJlZXplKG8gOiBhbnkpIHtcbiAgaWYgKHR5cGVvZiBvID09PSBcIm9iamVjdFwiKSB7XG4gICAgT2JqZWN0LmtleXMobykuZm9yRWFjaChmdW5jdGlvbihzS2V5KSB7XG4gICAgICBkZWVwRnJlZXplKG9bc0tleV0pO1xuICAgIH0pO1xuICAgIE9iamVjdC5mcmVlemUobyk7XG4gIH1cbn1cblxuXG4vLyBjb3VydGVzeSBvZlxuLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80NDU5OTI4L2hvdy10by1kZWVwLWNsb25lLWluLWphdmFzY3JpcHRcbmV4cG9ydCBmdW5jdGlvbiBjbG9uZURlZXAoaXRlbSA6IGFueSkgOiBhbnkgIHtcbiAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfSAvLyBudWxsLCB1bmRlZmluZWQgdmFsdWVzIGNoZWNrXG4gICAgdmFyIHR5cGVzID0gW051bWJlciwgU3RyaW5nLCBCb29sZWFuXSxcbiAgICAgICAgcmVzdWx0O1xuICAgIC8vIG5vcm1hbGl6aW5nIHByaW1pdGl2ZXMgaWYgc29tZW9uZSBkaWQgbmV3IFN0cmluZygnYWFhJyksIG9yIG5ldyBOdW1iZXIoJzQ0NCcpO1xuICAgIHR5cGVzLmZvckVhY2goZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiB0eXBlKSB7XG4gICAgICAgICAgICByZXN1bHQgPSB0eXBlKGl0ZW0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHR5cGVvZiByZXN1bHQgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGl0ZW0pID09PSBcIltvYmplY3QgQXJyYXldXCIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IFtdO1xuICAgICAgICAgICAgaXRlbS5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZCwgaW5kZXgsIGFycmF5KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0W2luZGV4XSA9IGNsb25lRGVlcChjaGlsZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICgodHlwZW9mIGl0ZW0gPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiB0eXBlb2YgaXRlbSkgPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgLy8gdGVzdGluZyB0aGF0IHRoaXMgaXMgRE9NXG4gICAgICAgICAgICBpZiAoIWl0ZW0ucHJvdG90eXBlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5ldyBEYXRlKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGl0IGlzIGFuIG9iamVjdCBsaXRlcmFsXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFtpXSA9IGNsb25lRGVlcChpdGVtW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBkZXBlbmRpbmcgd2hhdCB5b3Ugd291bGQgbGlrZSBoZXJlLFxuICAgICAgICAgICAgICAgIC8vICAgLy8ganVzdCBrZWVwIHRoZSByZWZlcmVuY2UsIG9yIGNyZWF0ZSBuZXcgb2JqZWN0XG4gICAgICAgICAgICAgICAgLy8gICBpZiAoZmFsc2UgJiYgaXRlbS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIC8vIHdvdWxkIG5vdCBhZHZpY2UgdG8gZG8gdGhhdCwgcmVhc29uPyBSZWFkIGJlbG93XG4gICAgICAgICAgICAgICAgLy8gICAgICAgIHJlc3VsdCA9IG5ldyBpdGVtLmNvbnN0cnVjdG9yKCk7XG4gICAgICAgICAgICAgICAgLy8gICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBpdGVtO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ID0gaXRlbTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG50eXBlIGZuYSA9IChhIDogbnVtYmVyLGIgOiBudW1iZXIpID0+IG51bWJlcjtcblxudHlwZSBmbkNvbXA8VD4gPSAoYSA6IFQsYiA6IFQpID0+IGJvb2xlYW47XG5cblxuZXhwb3J0IGNvbnN0IEFycmF5VXRpbHMgPSB7XG5cbiAgaW5kZXhPZiA6IGZ1bmN0aW9uPFQ+KG9NZW1iZXIgOiBULCBhQXJyIDogQXJyYXk8VD4sIGZuQ29tcCA6IGZuQ29tcDxUPiApIDogbnVtYmVyIHtcbiAgICBmbkNvbXAgPSBmbkNvbXAgfHwgZnVuY3Rpb24gKGE6VCwgYjpUKSB7IHJldHVybiBhID09PSBiIH07XG4gICAgdmFyIHJlc0luZGV4ID0gLTE7XG4gICAgYUFyci5ldmVyeShmdW5jdGlvbiAob01lbWJlckFyciwgaW5kZXgpIHtcbiAgICAgIHZhciB1ID0gZm5Db21wKG9NZW1iZXJBcnIsb01lbWJlcik7XG4gICAgICBpZih1KSB7XG4gICAgICAgIHJlc0luZGV4ID0gaW5kZXg7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHJldHVybiByZXNJbmRleDtcbiAgfSxcblxuICBwcmVzZW50SW4gOiBmdW5jdGlvbjxUPihvTWVtYmVyIDogVCwgYUFyciA6IEFycmF5PFQ+LCBmbkNvbXA/IDogZm5Db21wPFQ+ICkgOiBib29sZWFuIHtcbiAgICByZXR1cm4gQXJyYXlVdGlscy5pbmRleE9mKG9NZW1iZXIsIGFBcnIsIGZuQ29tcCkgPj0gMDtcbiAgfSxcblxuXG4gIHNldE1pbnVzIDogZnVuY3Rpb248VD4oYVJSMSA6IEFycmF5PFQ+LCBhUlIyIDogQXJyYXk8VD4sIGZuQ29tcD8gOiBmbkNvbXA8VD4pICB7XG4gICAgZm5Db21wID0gZm5Db21wIHx8IGZ1bmN0aW9uIChhOlQsIGI6VCkgeyByZXR1cm4gYSA9PT0gYiB9O1xuICAgIHJldHVybiAgYVJSMS5yZWR1Y2UoZnVuY3Rpb24oUmVzdWx0LCBvTWVtYmVyLCBpbmRleCkge1xuICAgICAgaWYgKCFBcnJheVV0aWxzLnByZXNlbnRJbihvTWVtYmVyLCBhUlIyLCBmbkNvbXApICYmICFBcnJheVV0aWxzLnByZXNlbnRJbihvTWVtYmVyLCBSZXN1bHQsIGZuQ29tcCkpIHtcbiAgICAgICAgUmVzdWx0LnB1c2gob01lbWJlcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gUmVzdWx0O1xuICAgIH0sW10gYXMgQXJyYXk8VD4pO1xuICB9XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
