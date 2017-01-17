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
function listToQuotedCommaWord(list, quote, word) {
    quote = quote || "";
    if (list.length === 0) {
        return quote + quote;
    }
    var base = list.slice(0, list.length - 1).join(quote + ", " + quote);
    if (base) {
        base = quote + base + quote + ' ' + word + ' ' + quote + list[list.length - 1] + quote;
        return base;
    }
    return quote + list[0] + quote;
}
exports.listToQuotedCommaWord = listToQuotedCommaWord;
function listToCommaAnd(list, quote) {
    return listToQuotedCommaWord(list, quote, 'and');
}
exports.listToCommaAnd = listToCommaAnd;
function listToCommaOr(list, quote) {
    return listToQuotedCommaWord(list, '', 'or');
}
exports.listToCommaOr = listToCommaOr;
function listToQuotedCommaAnd(list) {
    return listToQuotedCommaWord(list, '"', 'and');
}
exports.listToQuotedCommaAnd = listToQuotedCommaAnd;
function listToQuotedCommaOr(list, quote) {
    return listToQuotedCommaWord(list, '"', 'or');
}
exports.listToQuotedCommaOr = listToQuotedCommaOr;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy91dGlscy50cyJdLCJuYW1lcyI6WyJkZWVwRnJlZXplIiwibyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwic0tleSIsImZyZWV6ZSIsImV4cG9ydHMiLCJsaXN0VG9RdW90ZWRDb21tYVdvcmQiLCJsaXN0IiwicXVvdGUiLCJ3b3JkIiwibGVuZ3RoIiwiYmFzZSIsInNsaWNlIiwiam9pbiIsImxpc3RUb0NvbW1hQW5kIiwibGlzdFRvQ29tbWFPciIsImxpc3RUb1F1b3RlZENvbW1hQW5kIiwibGlzdFRvUXVvdGVkQ29tbWFPciIsImNsb25lRGVlcCIsIml0ZW0iLCJ0eXBlcyIsIk51bWJlciIsIlN0cmluZyIsIkJvb2xlYW4iLCJyZXN1bHQiLCJ0eXBlIiwicHJvdG90eXBlIiwidG9TdHJpbmciLCJjYWxsIiwiY2hpbGQiLCJpbmRleCIsImFycmF5IiwiRGF0ZSIsImkiLCJBcnJheVV0aWxzIiwiaW5kZXhPZiIsIm9NZW1iZXIiLCJhQXJyIiwiZm5Db21wIiwiYSIsImIiLCJyZXNJbmRleCIsImV2ZXJ5Iiwib01lbWJlckFyciIsInUiLCJwcmVzZW50SW4iLCJzZXRNaW51cyIsImFSUjEiLCJhUlIyIiwicmVkdWNlIiwiUmVzdWx0IiwicHVzaCJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUFDQSxTQUFBQSxVQUFBLENBQTJCQyxDQUEzQixFQUFrQztBQUNoQyxRQUFJLFFBQU9BLENBQVAseUNBQU9BLENBQVAsT0FBYSxRQUFqQixFQUEyQjtBQUN6QkMsZUFBT0MsSUFBUCxDQUFZRixDQUFaLEVBQWVHLE9BQWYsQ0FBdUIsVUFBU0MsSUFBVCxFQUFhO0FBQ2xDTCx1QkFBV0MsRUFBRUksSUFBRixDQUFYO0FBQ0QsU0FGRDtBQUdBSCxlQUFPSSxNQUFQLENBQWNMLENBQWQ7QUFDRDtBQUNGO0FBUGVNLFFBQUFQLFVBQUEsR0FBVUEsVUFBVjtBQVVoQixTQUFBUSxxQkFBQSxDQUFzQ0MsSUFBdEMsRUFBdURDLEtBQXZELEVBQXVFQyxJ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QyxJQUE3QixFQUE4Q1YsTUFBOUMsRUFBaUU7QUFDMUVBLGlCQUFTQSxVQUFVLFVBQVVDLENBQVYsRUFBZUMsQ0FBZixFQUFrQjtBQUFJLG1CQUFPRCxNQUFNQyxDQUFiO0FBQWdCLFNBQXpEO0FBQ0EsZUFBUU8sS0FBS0UsTUFBTCxDQUFZLFVBQVNDLE1BQVQsRUFBaUJkLE9BQWpCLEVBQTBCTixLQUExQixFQUErQjtBQUNqRCxnQkFBSSxDQUFDekIsUUFBQTZCLFVBQUEsQ0FBV1csU0FBWCxDQUFxQlQsT0FBckIsRUFBOEJZLElBQTlCLEVBQW9DVixNQUFwQyxDQUFELElBQWdELENBQUNqQyxRQUFBNkIsVUFBQSxDQUFXVyxTQUFYLENBQXFCVCxPQUFyQixFQUE4QmMsTUFBOUIsRUFBc0NaLE1BQXRDLENBQXJELEVBQW9HO0FBQ2xHWSx1QkFBT0MsSUFBUCxDQUFZZixPQUFaO0FBQ0Q7QUFDRCxtQkFBT2MsTUFBUDtBQUNELFNBTE8sRUFLTixFQUxNLENBQVI7QUFNRDtBQTdCdUIsQ0FBYiIsImZpbGUiOiJ1dGlscy91dGlscy5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbmV4cG9ydCBmdW5jdGlvbiBkZWVwRnJlZXplKG8gOiBhbnkpIHtcbiAgaWYgKHR5cGVvZiBvID09PSBcIm9iamVjdFwiKSB7XG4gICAgT2JqZWN0LmtleXMobykuZm9yRWFjaChmdW5jdGlvbihzS2V5KSB7XG4gICAgICBkZWVwRnJlZXplKG9bc0tleV0pO1xuICAgIH0pO1xuICAgIE9iamVjdC5mcmVlemUobyk7XG4gIH1cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdFRvUXVvdGVkQ29tbWFXb3JkKGxpc3QgOiBzdHJpbmdbXSwgcXVvdGUgOiBzdHJpbmcsIHdvcmQ6IHN0cmluZykge1xuICAgIHF1b3RlID0gcXVvdGUgfHwgXCJcIjtcbiAgICBpZiggbGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHF1b3RlICsgcXVvdGU7XG4gICAgfVxuICAgIHZhciBiYXNlID0gbGlzdC5zbGljZSgwLGxpc3QubGVuZ3RoLTEpLmpvaW4ocXVvdGUgKyBcIiwgXCIgKyBxdW90ZSk7XG4gICAgaWYoYmFzZSkge1xuICAgICAgICBiYXNlID0gcXVvdGUgKyBiYXNlICsgcXVvdGUgKyAnICcgKyB3b3JkICsgJyAnICsgcXVvdGUgKyBsaXN0W2xpc3QubGVuZ3RoLTFdICsgcXVvdGU7XG4gICAgICAgIHJldHVybiBiYXNlO1xuICAgIH1cbiAgICByZXR1cm4gcXVvdGUgKyBsaXN0WzBdICsgcXVvdGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0VG9Db21tYUFuZChsaXN0IDogc3RyaW5nW10sIHF1b3RlPyA6IHN0cmluZykge1xuICAgIHJldHVybiBsaXN0VG9RdW90ZWRDb21tYVdvcmQobGlzdCxxdW90ZSwgJ2FuZCcpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RUb0NvbW1hT3IobGlzdCA6IHN0cmluZ1tdLCBxdW90ZT8gOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gIGxpc3RUb1F1b3RlZENvbW1hV29yZChsaXN0LCcnLCAnb3InKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RUb1F1b3RlZENvbW1hQW5kKGxpc3QgOiBzdHJpbmdbXSkge1xuICAgIHJldHVybiBsaXN0VG9RdW90ZWRDb21tYVdvcmQobGlzdCwnXCInLCdhbmQnKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBsaXN0VG9RdW90ZWRDb21tYU9yKGxpc3QgOiBzdHJpbmdbXSwgcXVvdGU/IDogc3RyaW5nKSB7XG4gICAgcmV0dXJuICBsaXN0VG9RdW90ZWRDb21tYVdvcmQobGlzdCwnXCInLCAnb3InKTtcbn1cblxuLy8gY291cnRlc3kgb2Zcbi8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNDQ1OTkyOC9ob3ctdG8tZGVlcC1jbG9uZS1pbi1qYXZhc2NyaXB0XG5leHBvcnQgZnVuY3Rpb24gY2xvbmVEZWVwKGl0ZW0gOiBhbnkpIDogYW55ICB7XG4gICAgaWYgKCFpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIH0gLy8gbnVsbCwgdW5kZWZpbmVkIHZhbHVlcyBjaGVja1xuICAgIHZhciB0eXBlcyA9IFtOdW1iZXIsIFN0cmluZywgQm9vbGVhbl0sXG4gICAgICAgIHJlc3VsdDtcbiAgICAvLyBub3JtYWxpemluZyBwcmltaXRpdmVzIGlmIHNvbWVvbmUgZGlkIG5ldyBTdHJpbmcoJ2FhYScpLCBvciBuZXcgTnVtYmVyKCc0NDQnKTtcbiAgICB0eXBlcy5mb3JFYWNoKGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgdHlwZSkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdHlwZShpdGVtKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGlmICh0eXBlb2YgcmVzdWx0ID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpdGVtKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBbXTtcbiAgICAgICAgICAgIGl0ZW0uZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQsIGluZGV4LCBhcnJheSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdFtpbmRleF0gPSBjbG9uZURlZXAoY2hpbGQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoKHR5cGVvZiBpdGVtID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogdHlwZW9mIGl0ZW0pID09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIC8vIHRlc3RpbmcgdGhhdCB0aGlzIGlzIERPTVxuICAgICAgICAgICAgaWYgKCFpdGVtLnByb3RvdHlwZSkge1xuICAgICAgICAgICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgRGF0ZShpdGVtKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBpdCBpcyBhbiBvYmplY3QgbGl0ZXJhbFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRbaV0gPSBjbG9uZURlZXAoaXRlbVtpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gZGVwZW5kaW5nIHdoYXQgeW91IHdvdWxkIGxpa2UgaGVyZSxcbiAgICAgICAgICAgICAgICAvLyAgIC8vIGp1c3Qga2VlcCB0aGUgcmVmZXJlbmNlLCBvciBjcmVhdGUgbmV3IG9iamVjdFxuICAgICAgICAgICAgICAgIC8vICAgaWYgKGZhbHNlICYmIGl0ZW0uY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICAvLyB3b3VsZCBub3QgYWR2aWNlIHRvIGRvIHRoYXQsIHJlYXNvbj8gUmVhZCBiZWxvd1xuICAgICAgICAgICAgICAgIC8vICAgICAgICByZXN1bHQgPSBuZXcgaXRlbS5jb25zdHJ1Y3RvcigpO1xuICAgICAgICAgICAgICAgIC8vICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gaXRlbTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGl0ZW07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxudHlwZSBmbmEgPSAoYSA6IG51bWJlcixiIDogbnVtYmVyKSA9PiBudW1iZXI7XG5cbnR5cGUgZm5Db21wPFQ+ID0gKGEgOiBULGIgOiBUKSA9PiBib29sZWFuO1xuXG5cbmV4cG9ydCBjb25zdCBBcnJheVV0aWxzID0ge1xuXG4gIGluZGV4T2YgOiBmdW5jdGlvbjxUPihvTWVtYmVyIDogVCwgYUFyciA6IEFycmF5PFQ+LCBmbkNvbXAgOiBmbkNvbXA8VD4gKSA6IG51bWJlciB7XG4gICAgZm5Db21wID0gZm5Db21wIHx8IGZ1bmN0aW9uIChhOlQsIGI6VCkgeyByZXR1cm4gYSA9PT0gYiB9O1xuICAgIHZhciByZXNJbmRleCA9IC0xO1xuICAgIGFBcnIuZXZlcnkoZnVuY3Rpb24gKG9NZW1iZXJBcnIsIGluZGV4KSB7XG4gICAgICB2YXIgdSA9IGZuQ29tcChvTWVtYmVyQXJyLG9NZW1iZXIpO1xuICAgICAgaWYodSkge1xuICAgICAgICByZXNJbmRleCA9IGluZGV4O1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzSW5kZXg7XG4gIH0sXG5cbiAgcHJlc2VudEluIDogZnVuY3Rpb248VD4ob01lbWJlciA6IFQsIGFBcnIgOiBBcnJheTxUPiwgZm5Db21wPyA6IGZuQ29tcDxUPiApIDogYm9vbGVhbiB7XG4gICAgcmV0dXJuIEFycmF5VXRpbHMuaW5kZXhPZihvTWVtYmVyLCBhQXJyLCBmbkNvbXApID49IDA7XG4gIH0sXG5cblxuICBzZXRNaW51cyA6IGZ1bmN0aW9uPFQ+KGFSUjEgOiBBcnJheTxUPiwgYVJSMiA6IEFycmF5PFQ+LCBmbkNvbXA/IDogZm5Db21wPFQ+KSAge1xuICAgIGZuQ29tcCA9IGZuQ29tcCB8fCBmdW5jdGlvbiAoYTpULCBiOlQpIHsgcmV0dXJuIGEgPT09IGIgfTtcbiAgICByZXR1cm4gIGFSUjEucmVkdWNlKGZ1bmN0aW9uKFJlc3VsdCwgb01lbWJlciwgaW5kZXgpIHtcbiAgICAgIGlmICghQXJyYXlVdGlscy5wcmVzZW50SW4ob01lbWJlciwgYVJSMiwgZm5Db21wKSAmJiAhQXJyYXlVdGlscy5wcmVzZW50SW4ob01lbWJlciwgUmVzdWx0LCBmbkNvbXApKSB7XG4gICAgICAgIFJlc3VsdC5wdXNoKG9NZW1iZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFJlc3VsdDtcbiAgICB9LFtdIGFzIEFycmF5PFQ+KTtcbiAgfVxufVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
