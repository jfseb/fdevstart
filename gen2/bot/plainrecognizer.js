"use strict";
/**
 * @copyright (c) 2016 Gerd Forstmann
 * @file plainrecognizer.ts
 *
 * A recognizer parametrized by regex expressions
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Object.defineProperty(exports, "__esModule", { value: true });
var debug = require("debug");
var debuglog = debug('plainrecognizer');
var AnyObject = Object;
function recognize(sString, mRules) {
    var res = undefined;
    mRules.every(function (oRule) {
        res = matchRegularExpression(sString, oRule);
        return !res;
    });
    return res;
}
exports.recognize = recognize;
function countParenGroups(s) {
    var res = 0;
    for (var i = 0; i < s.length; ++i) {
        if (s.charAt(i) === '(') {
            ++res;
        }
    }
    return res;
}
exports.countParenGroups = countParenGroups;
/**
 * given a string, e.g.
 * "who is the <category> of <A1>",
 * @param {string} a
 * @returns {IMatch.IRule} a regexp rule
 */
function parseRuleString(a) {
    var s = "^" + a + "$";
    var argMaps = {};
    var m = undefined;
    while (m = /<([^>]+)>([?]?)/.exec(s)) {
        var cat = m[1];
        var greedy = m[2];
        var pos = 1 + countParenGroups(s.substring(0, m.index));
        if (greedy) {
            s = s.replace("<" + cat + ">?", "(.*?)");
        } else {
            s = s.replace("<" + cat + ">", "(.*)");
        }
        if (argMaps[cat]) {
            throw Error("Model error duplicate entry!");
        }
        argMaps[cat] = pos;
    }
    return {
        type: 1,
        regexp: new RegExp(s, "i"),
        argsMap: argMaps
    };
}
exports.parseRuleString = parseRuleString;
/**
 * given a string, e.g.
 * "who is the <category> of <A1>",
 * @param {string} a
 * @returns {IMatch.IRule} a regexp rule
 */
function parseRuleArray(a) {
    var s = "^" + a + "$";
    var r = a[0];
    if (typeof a[0] === "string") {
        r = new RegExp(a[0], "i");
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
exports.parseRuleArray = parseRuleArray;
function parseRule(a) {
    if (typeof a === 'string') {
        return parseRuleString(a);
    } else if (Array.isArray(a)) {
        return parseRuleArray(a);
    }
    throw new Error("unknown rule definition");
}
exports.parseRule = parseRule;
function parseRules(oJSON) {
    var res = {};
    Object.keys(oJSON).forEach(function (sKey) {
        res[sKey] = oJSON[sKey].map(function (oRule) {
            return parseRule(oRule);
        });
    });
    return res;
}
exports.parseRules = parseRules;
;
function trimValueAdjusting(value) {
    var res = { deltaStart: 0, value: value };
    var m = value.match(/^\s+/);
    if (m) {
        res.deltaStart = m[0].length;
        value = value.substr(res.deltaStart);
    }
    m = value.match(/\s+$/);
    if (m) {
        value = value.substr(0, value.length - m[0].length);
    }
    res.value = value;
    return res;
}
exports.trimValueAdjusting = trimValueAdjusting;
function extractArgsMap(s, match, argsMap) {
    if (!argsMap) {
        return [];
    }
    var result = [];
    Object.keys(argsMap).forEach(function (sKey) {
        var res = {};
        var index = argsMap[sKey];
        var value = match[index];
        if (typeof value === "string" && value.length > 0) {
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
    });
    return result;
}
exports.extractArgsMap = extractArgsMap;
function matchRegularExpression(text, oRule) {
    debuglog("regexp is " + oRule.regexp.toString());
    debuglog(" text is " + text);
    var m = oRule.regexp.exec(text);
    if (!m) {
        return undefined;
    }
    var res = {};
    res.entities = extractArgsMap(text, m, oRule.argsMap);
    res.score = 0.9;
    debuglog("match " + JSON.stringify(m));
    debuglog('Found one' + JSON.stringify(res, undefined, 2));
    return res;
}
exports.matchRegularExpression = matchRegularExpression;
function trimTrailingSentenceDelimiters(text) {
    var m = /([!.;, ?]|\s)+$/.exec(text);
    if (m) {
        text = text.substr(0, text.length - m[0].length);
    }
    return text;
}
exports.trimTrailingSentenceDelimiters = trimTrailingSentenceDelimiters;
function normalizeWhitespace(text) {
    text = text.replace(/\s+/g, ' ');
    return text;
}
exports.normalizeWhitespace = normalizeWhitespace;
/**
 * Givena string, replace all "....."  with <word>
 */
function compactQuoted(text) {
    text = text.replace(/"[^"]+"/g, "<word>");
    return text;
}
exports.compactQuoted = compactQuoted;
function countCompactWords(text) {
    text = text.replace(/,/g, ' ');
    text = text.replace(/ \s+/g, ' ');
    return text.split(" ").length;
}
exports.countCompactWords = countCompactWords;
function checkForLength(text) {
    var textStripped = trimTrailingSentenceDelimiters(text);
    if (textStripped.length > 200 || countCompactWords(compactQuoted(text)) > 20) {
        return {
            intent: "TooLong",
            score: 1.0,
            entities: []
        };
    }
    return undefined;
}
exports.checkForLength = checkForLength;
function recognizeText(text, aRules) {
    var res = undefined;
    aRules.every(function (oRule) {
        res = matchRegularExpression(text, oRule);
        return !res;
    });
    return res;
}
exports.recognizeText = recognizeText;

var RegExpRecognizer = function () {
    function RegExpRecognizer(xRules) {
        _classCallCheck(this, RegExpRecognizer);

        this.oRules = xRules;
        debuglog("rules " + JSON.stringify(this.oRules));
    }

    _createClass(RegExpRecognizer, [{
        key: "recognize",
        value: function recognize(context, callback) {
            var u = {};
            var text = context.message.text;
            var that = this;
            var r = checkForLength(text);
            if (r) {
                callback(undefined, r);
                return;
            }
            debuglog("rules " + JSON.stringify(this.oRules));
            var text = trimTrailingSentenceDelimiters(text);
            var results = Object.keys(this.oRules).map(function (sKey) {
                var u = recognizeText(text, that.oRules[sKey]);
                if (u) {
                    u.intent = sKey;
                }
                return u ? u : undefined;
            }).filter(function (o) {
                return !!o;
            });
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
            var e1 = {};
            e1.startIndex = "exit ".length;
            e1.endIndex = context.message.text.length;
            e1.score = 0.1;
            u.entities = [];
            callback(undefined, u);
        }
    }]);

    return RegExpRecognizer;
}(); // class


exports.RegExpRecognizer = RegExpRecognizer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJvdC9wbGFpbnJlY29nbml6ZXIuanMiLCIuLi9zcmMvYm90L3BsYWlucmVjb2duaXplci50cyJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsImRlYnVnIiwicmVxdWlyZSIsImRlYnVnbG9nIiwiQW55T2JqZWN0IiwicmVjb2duaXplIiwic1N0cmluZyIsIm1SdWxlcyIsInJlcyIsInVuZGVmaW5lZCIsImV2ZXJ5Iiwib1J1bGUiLCJtYXRjaFJlZ3VsYXJFeHByZXNzaW9uIiwiY291bnRQYXJlbkdyb3VwcyIsInMiLCJpIiwibGVuZ3RoIiwiY2hhckF0IiwicGFyc2VSdWxlU3RyaW5nIiwiYSIsImFyZ01hcHMiLCJtIiwiZXhlYyIsImNhdCIsImdyZWVkeSIsInBvcyIsInN1YnN0cmluZyIsImluZGV4IiwicmVwbGFjZSIsIkVycm9yIiwidHlwZSIsInJlZ2V4cCIsIlJlZ0V4cCIsImFyZ3NNYXAiLCJwYXJzZVJ1bGVBcnJheSIsInIiLCJKU09OIiwic3RyaW5naWZ5IiwicGFyc2VSdWxlIiwiQXJyYXkiLCJpc0FycmF5IiwicGFyc2VSdWxlcyIsIm9KU09OIiwia2V5cyIsImZvckVhY2giLCJzS2V5IiwibWFwIiwidHJpbVZhbHVlQWRqdXN0aW5nIiwiZGVsdGFTdGFydCIsIm1hdGNoIiwic3Vic3RyIiwiZXh0cmFjdEFyZ3NNYXAiLCJyZXN1bHQiLCJlbnRpdHkiLCJzdGFydEluZGV4IiwiaW5kZXhPZiIsInRyaW1BZGp1c3QiLCJlbmRJbmRleCIsInB1c2giLCJ0ZXh0IiwidG9TdHJpbmciLCJlbnRpdGllcyIsInNjb3JlIiwidHJpbVRyYWlsaW5nU2VudGVuY2VEZWxpbWl0ZXJzIiwibm9ybWFsaXplV2hpdGVzcGFjZSIsImNvbXBhY3RRdW90ZWQiLCJjb3VudENvbXBhY3RXb3JkcyIsInNwbGl0IiwiY2hlY2tGb3JMZW5ndGgiLCJ0ZXh0U3RyaXBwZWQiLCJpbnRlbnQiLCJyZWNvZ25pemVUZXh0IiwiYVJ1bGVzIiwiUmVnRXhwUmVjb2duaXplciIsInhSdWxlcyIsIm9SdWxlcyIsImNvbnRleHQiLCJjYWxsYmFjayIsInUiLCJtZXNzYWdlIiwidGhhdCIsInJlc3VsdHMiLCJmaWx0ZXIiLCJvIiwiZTEiXSwibWFwcGluZ3MiOiJBQUFBO0FDQ0E7Ozs7Ozs7Ozs7O0FETUFBLE9BQU9DLGNBQVAsQ0FBc0JDLE9BQXRCLEVBQStCLFlBQS9CLEVBQTZDLEVBQUVDLE9BQU8sSUFBVCxFQUE3QztBQ0lBLElBQUFDLFFBQUFDLFFBQUEsT0FBQSxDQUFBO0FBQ0EsSUFBTUMsV0FBV0YsTUFBTSxpQkFBTixDQUFqQjtBQUVBLElBQU1HLFlBQVlQLE1BQWxCO0FBRUEsU0FBQVEsU0FBQSxDQUEwQkMsT0FBMUIsRUFBbUNDLE1BQW5DLEVBQW1FO0FBQ2pFLFFBQUlDLE1BQU1DLFNBQVY7QUFDQUYsV0FBT0csS0FBUCxDQUFhLFVBQVVDLEtBQVYsRUFBZTtBQUMxQkgsY0FBTUksdUJBQXVCTixPQUF2QixFQUFnQ0ssS0FBaEMsQ0FBTjtBQUNBLGVBQU8sQ0FBQ0gsR0FBUjtBQUNELEtBSEQ7QUFJQSxXQUFPQSxHQUFQO0FBQ0Q7QUFQRFQsUUFBQU0sU0FBQSxHQUFBQSxTQUFBO0FBU0EsU0FBQVEsZ0JBQUEsQ0FBaUNDLENBQWpDLEVBQTBDO0FBQ3hDLFFBQUlOLE1BQU0sQ0FBVjtBQUNBLFNBQUssSUFBSU8sSUFBSSxDQUFiLEVBQWdCQSxJQUFJRCxFQUFFRSxNQUF0QixFQUE4QixFQUFFRCxDQUFoQyxFQUFtQztBQUNqQyxZQUFJRCxFQUFFRyxNQUFGLENBQVNGLENBQVQsTUFBZ0IsR0FBcEIsRUFBeUI7QUFDdkIsY0FBRVAsR0FBRjtBQUNEO0FBQ0Y7QUFDRCxXQUFPQSxHQUFQO0FBQ0Q7QUFSRFQsUUFBQWMsZ0JBQUEsR0FBQUEsZ0JBQUE7QUFVQTs7Ozs7O0FBTUEsU0FBQUssZUFBQSxDQUFnQ0MsQ0FBaEMsRUFBeUM7QUFDdkMsUUFBSUwsSUFBSSxNQUFNSyxDQUFOLEdBQVUsR0FBbEI7QUFDQSxRQUFJ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RUFBTztBQUNMQSxzQkFBRVIsTUFBRixHQUFXekIsSUFBWDtBQUNEO0FBQ0QsdUJBQU9pQyxJQUFLQSxDQUFMLEdBQVNyRSxTQUFoQjtBQUNELGFBTmEsRUFNWHlFLE1BTlcsQ0FNSixVQUFVQyxDQUFWLEVBQVc7QUFBSSx1QkFBTyxDQUFDLENBQUNBLENBQVQ7QUFBYSxhQU54QixDQUFkO0FBT0EsZ0JBQUlGLFFBQVFqRSxNQUFSLEdBQWlCLENBQXJCLEVBQXdCO0FBQ3RCO0FBQ0FiLHlCQUFTLDJCQUEyQndELElBQTNCLEdBQWtDLEdBQWxDLEdBQXdDdkIsS0FBS0MsU0FBTCxDQUFlN0IsR0FBZixDQUFqRDtBQUNEO0FBQ0QsZ0JBQUl5RSxRQUFRakUsTUFBUixHQUFpQixDQUFyQixFQUF3QjtBQUN0QixvQkFBSVIsTUFBTXlFLFFBQVEsQ0FBUixDQUFWO0FBQ0FKLHlCQUFTcEUsU0FBVCxFQUFvQkQsR0FBcEI7QUFDQTtBQUNEO0FBQ0RMLHFCQUFTLHFCQUFUO0FBQ0EyRSxjQUFFUixNQUFGLEdBQVcsTUFBWDtBQUNBUSxjQUFFaEIsS0FBRixHQUFVLEdBQVY7QUFDQSxnQkFBSXNCLEtBQUssRUFBVDtBQUNBQSxlQUFHOUIsVUFBSCxHQUFnQixRQUFRdEMsTUFBeEI7QUFDQW9FLGVBQUczQixRQUFILEdBQWNtQixRQUFRRyxPQUFSLENBQWdCcEIsSUFBaEIsQ0FBcUIzQyxNQUFuQztBQUNBb0UsZUFBR3RCLEtBQUgsR0FBVyxHQUFYO0FBQ0FnQixjQUFFakIsUUFBRixHQUFhLEVBQWI7QUFDQWdCLHFCQUFTcEUsU0FBVCxFQUFvQnFFLENBQXBCO0FBQ0Q7Ozs7S0FDRDs7O0FBL0NGL0UsUUFBQTBFLGdCQUFBLEdBQUFBLGdCQUFBIiwiZmlsZSI6ImJvdC9wbGFpbnJlY29nbml6ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbi8qKlxuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICogQGZpbGUgcGxhaW5yZWNvZ25pemVyLnRzXG4gKlxuICogQSByZWNvZ25pemVyIHBhcmFtZXRyaXplZCBieSByZWdleCBleHByZXNzaW9uc1xuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBkZWJ1ZyA9IHJlcXVpcmUoXCJkZWJ1Z1wiKTtcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ3BsYWlucmVjb2duaXplcicpO1xuY29uc3QgQW55T2JqZWN0ID0gT2JqZWN0O1xuZnVuY3Rpb24gcmVjb2duaXplKHNTdHJpbmcsIG1SdWxlcykge1xuICAgIHZhciByZXMgPSB1bmRlZmluZWQ7XG4gICAgbVJ1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICByZXMgPSBtYXRjaFJlZ3VsYXJFeHByZXNzaW9uKHNTdHJpbmcsIG9SdWxlKTtcbiAgICAgICAgcmV0dXJuICFyZXM7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMucmVjb2duaXplID0gcmVjb2duaXplO1xuZnVuY3Rpb24gY291bnRQYXJlbkdyb3VwcyhzKSB7XG4gICAgdmFyIHJlcyA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGlmIChzLmNoYXJBdChpKSA9PT0gJygnKSB7XG4gICAgICAgICAgICArK3JlcztcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jb3VudFBhcmVuR3JvdXBzID0gY291bnRQYXJlbkdyb3Vwcztcbi8qKlxuICogZ2l2ZW4gYSBzdHJpbmcsIGUuZy5cbiAqIFwid2hvIGlzIHRoZSA8Y2F0ZWdvcnk+IG9mIDxBMT5cIixcbiAqIEBwYXJhbSB7c3RyaW5nfSBhXG4gKiBAcmV0dXJucyB7SU1hdGNoLklSdWxlfSBhIHJlZ2V4cCBydWxlXG4gKi9cbmZ1bmN0aW9uIHBhcnNlUnVsZVN0cmluZyhhKSB7XG4gICAgdmFyIHMgPSBcIl5cIiArIGEgKyBcIiRcIjtcbiAgICB2YXIgYXJnTWFwcyA9IHt9O1xuICAgIHZhciBtID0gdW5kZWZpbmVkO1xuICAgIHdoaWxlIChtID0gLzwoW14+XSspPihbP10/KS8uZXhlYyhzKSkge1xuICAgICAgICB2YXIgY2F0ID0gbVsxXTtcbiAgICAgICAgdmFyIGdyZWVkeSA9IG1bMl07XG4gICAgICAgIHZhciBwb3MgPSAxICsgY291bnRQYXJlbkdyb3VwcyhzLnN1YnN0cmluZygwLCBtLmluZGV4KSk7XG4gICAgICAgIGlmIChncmVlZHkpIHtcbiAgICAgICAgICAgIHMgPSBzLnJlcGxhY2UoXCI8XCIgKyBjYXQgKyBcIj4/XCIsIFwiKC4qPylcIik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzID0gcy5yZXBsYWNlKFwiPFwiICsgY2F0ICsgXCI+XCIsIFwiKC4qKVwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJnTWFwc1tjYXRdKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIk1vZGVsIGVycm9yIGR1cGxpY2F0ZSBlbnRyeSFcIik7XG4gICAgICAgIH1cbiAgICAgICAgYXJnTWFwc1tjYXRdID0gcG9zO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAxLFxuICAgICAgICByZWdleHA6IG5ldyBSZWdFeHAocywgXCJpXCIpLFxuICAgICAgICBhcmdzTWFwOiBhcmdNYXBzXG4gICAgfTtcbn1cbmV4cG9ydHMucGFyc2VSdWxlU3RyaW5nID0gcGFyc2VSdWxlU3RyaW5nO1xuLyoqXG4gKiBnaXZlbiBhIHN0cmluZywgZS5nLlxuICogXCJ3aG8gaXMgdGhlIDxjYXRlZ29yeT4gb2YgPEExPlwiLFxuICogQHBhcmFtIHtzdHJpbmd9IGFcbiAqIEByZXR1cm5zIHtJTWF0Y2guSVJ1bGV9IGEgcmVnZXhwIHJ1bGVcbiAqL1xuZnVuY3Rpb24gcGFyc2VSdWxlQXJyYXkoYSkge1xuICAgIHZhciBzID0gXCJeXCIgKyBhICsgXCIkXCI7XG4gICAgdmFyIHIgPSBhWzBdO1xuICAgIGlmICh0eXBlb2YgYVswXSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICByID0gbmV3IFJlZ0V4cChhWzBdLCBcImlcIik7XG4gICAgfVxuICAgIGlmICghKHIgaW5zdGFuY2VvZiBSZWdFeHApKSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiaWxsZWdhbCBzdGF0ZVwiICsgSlNPTi5zdHJpbmdpZnkoYSkpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAxLFxuICAgICAgICByZWdleHA6IHIsXG4gICAgICAgIGFyZ3NNYXA6IGFbMV1cbiAgICB9O1xufVxuZXhwb3J0cy5wYXJzZVJ1bGVBcnJheSA9IHBhcnNlUnVsZUFycmF5O1xuZnVuY3Rpb24gcGFyc2VSdWxlKGEpIHtcbiAgICBpZiAodHlwZW9mIGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBwYXJzZVJ1bGVTdHJpbmcoYSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYSkpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlUnVsZUFycmF5KGEpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHJ1bGUgZGVmaW5pdGlvblwiKTtcbn1cbmV4cG9ydHMucGFyc2VSdWxlID0gcGFyc2VSdWxlO1xuZnVuY3Rpb24gcGFyc2VSdWxlcyhvSlNPTikge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhvSlNPTikuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICByZXNbc0tleV0gPSBvSlNPTltzS2V5XS5tYXAoZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VSdWxlKG9SdWxlKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMucGFyc2VSdWxlcyA9IHBhcnNlUnVsZXM7XG47XG5mdW5jdGlvbiB0cmltVmFsdWVBZGp1c3RpbmcodmFsdWUpIHtcbiAgICB2YXIgcmVzID0geyBkZWx0YVN0YXJ0OiAwLCB2YWx1ZTogdmFsdWUgfTtcbiAgICB2YXIgbSA9IHZhbHVlLm1hdGNoKC9eXFxzKy8pO1xuICAgIGlmIChtKSB7XG4gICAgICAgIHJlcy5kZWx0YVN0YXJ0ID0gbVswXS5sZW5ndGg7XG4gICAgICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyKHJlcy5kZWx0YVN0YXJ0KTtcbiAgICB9XG4gICAgbSA9IHZhbHVlLm1hdGNoKC9cXHMrJC8pO1xuICAgIGlmIChtKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyKDAsIHZhbHVlLmxlbmd0aCAtIG1bMF0ubGVuZ3RoKTtcbiAgICB9XG4gICAgcmVzLnZhbHVlID0gdmFsdWU7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMudHJpbVZhbHVlQWRqdXN0aW5nID0gdHJpbVZhbHVlQWRqdXN0aW5nO1xuZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAocywgbWF0Y2gsIGFyZ3NNYXApIHtcbiAgICBpZiAoIWFyZ3NNYXApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICB2YXIgcmVzID0ge307XG4gICAgICAgIHZhciBpbmRleCA9IGFyZ3NNYXBbc0tleV07XG4gICAgICAgIHZhciB2YWx1ZSA9IG1hdGNoW2luZGV4XTtcbiAgICAgICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlcy50eXBlID0gc0tleTtcbiAgICAgICAgICAgIHJlcy5lbnRpdHkgPSB2YWx1ZTtcbiAgICAgICAgICAgIHJlcy5zdGFydEluZGV4ID0gcy5pbmRleE9mKHZhbHVlKTsgLy8gdGhpcyBtYXkgbm90IGJlIHByZWNpc2VcbiAgICAgICAgICAgIHZhciB0cmltQWRqdXN0ID0gdHJpbVZhbHVlQWRqdXN0aW5nKHZhbHVlKTtcbiAgICAgICAgICAgIHJlcy5zdGFydEluZGV4ICs9IHRyaW1BZGp1c3QuZGVsdGFTdGFydDtcbiAgICAgICAgICAgIHJlcy5lbnRpdHkgPSB0cmltQWRqdXN0LnZhbHVlO1xuICAgICAgICAgICAgcmVzLmVuZEluZGV4ID0gcmVzLnN0YXJ0SW5kZXggKyB0cmltQWRqdXN0LnZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgIC8vcmVzW3NLZXldID0gdmFsdWVcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHJlcyk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZXhwb3J0cy5leHRyYWN0QXJnc01hcCA9IGV4dHJhY3RBcmdzTWFwO1xuZnVuY3Rpb24gbWF0Y2hSZWd1bGFyRXhwcmVzc2lvbih0ZXh0LCBvUnVsZSkge1xuICAgIGRlYnVnbG9nKFwicmVnZXhwIGlzIFwiICsgb1J1bGUucmVnZXhwLnRvU3RyaW5nKCkpO1xuICAgIGRlYnVnbG9nKFwiIHRleHQgaXMgXCIgKyB0ZXh0KTtcbiAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHRleHQpO1xuICAgIGlmICghbSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgcmVzID0ge307XG4gICAgcmVzLmVudGl0aWVzID0gZXh0cmFjdEFyZ3NNYXAodGV4dCwgbSwgb1J1bGUuYXJnc01hcCk7XG4gICAgcmVzLnNjb3JlID0gMC45O1xuICAgIGRlYnVnbG9nKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLm1hdGNoUmVndWxhckV4cHJlc3Npb24gPSBtYXRjaFJlZ3VsYXJFeHByZXNzaW9uO1xuZnVuY3Rpb24gdHJpbVRyYWlsaW5nU2VudGVuY2VEZWxpbWl0ZXJzKHRleHQpIHtcbiAgICB2YXIgbSA9IC8oWyEuOywgP118XFxzKSskLy5leGVjKHRleHQpO1xuICAgIGlmIChtKSB7XG4gICAgICAgIHRleHQgPSB0ZXh0LnN1YnN0cigwLCB0ZXh0Lmxlbmd0aCAtIG1bMF0ubGVuZ3RoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRleHQ7XG59XG5leHBvcnRzLnRyaW1UcmFpbGluZ1NlbnRlbmNlRGVsaW1pdGVycyA9IHRyaW1UcmFpbGluZ1NlbnRlbmNlRGVsaW1pdGVycztcbmZ1bmN0aW9uIG5vcm1hbGl6ZVdoaXRlc3BhY2UodGV4dCkge1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xccysvZywgJyAnKTtcbiAgICByZXR1cm4gdGV4dDtcbn1cbmV4cG9ydHMubm9ybWFsaXplV2hpdGVzcGFjZSA9IG5vcm1hbGl6ZVdoaXRlc3BhY2U7XG4vKipcbiAqIEdpdmVuYSBzdHJpbmcsIHJlcGxhY2UgYWxsIFwiLi4uLi5cIiAgd2l0aCA8d29yZD5cbiAqL1xuZnVuY3Rpb24gY29tcGFjdFF1b3RlZCh0ZXh0KSB7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvXCJbXlwiXStcIi9nLCBcIjx3b3JkPlwiKTtcbiAgICByZXR1cm4gdGV4dDtcbn1cbmV4cG9ydHMuY29tcGFjdFF1b3RlZCA9IGNvbXBhY3RRdW90ZWQ7XG5mdW5jdGlvbiBjb3VudENvbXBhY3RXb3Jkcyh0ZXh0KSB7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvLC9nLCAnICcpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyBcXHMrL2csICcgJyk7XG4gICAgcmV0dXJuIHRleHQuc3BsaXQoXCIgXCIpLmxlbmd0aDtcbn1cbmV4cG9ydHMuY291bnRDb21wYWN0V29yZHMgPSBjb3VudENvbXBhY3RXb3JkcztcbmZ1bmN0aW9uIGNoZWNrRm9yTGVuZ3RoKHRleHQpIHtcbiAgICB2YXIgdGV4dFN0cmlwcGVkID0gdHJpbVRyYWlsaW5nU2VudGVuY2VEZWxpbWl0ZXJzKHRleHQpO1xuICAgIGlmICgodGV4dFN0cmlwcGVkLmxlbmd0aCA+IDIwMCkgfHwgKGNvdW50Q29tcGFjdFdvcmRzKGNvbXBhY3RRdW90ZWQodGV4dCkpID4gMjApKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpbnRlbnQ6IFwiVG9vTG9uZ1wiLFxuICAgICAgICAgICAgc2NvcmU6IDEuMCxcbiAgICAgICAgICAgIGVudGl0aWVzOiBbXVxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5jaGVja0Zvckxlbmd0aCA9IGNoZWNrRm9yTGVuZ3RoO1xuZnVuY3Rpb24gcmVjb2duaXplVGV4dCh0ZXh0LCBhUnVsZXMpIHtcbiAgICB2YXIgcmVzID0gdW5kZWZpbmVkO1xuICAgIGFSdWxlcy5ldmVyeShmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgcmVzID0gbWF0Y2hSZWd1bGFyRXhwcmVzc2lvbih0ZXh0LCBvUnVsZSk7XG4gICAgICAgIHJldHVybiAhcmVzO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLnJlY29nbml6ZVRleHQgPSByZWNvZ25pemVUZXh0O1xuY2xhc3MgUmVnRXhwUmVjb2duaXplciB7XG4gICAgY29uc3RydWN0b3IoeFJ1bGVzKSB7XG4gICAgICAgIHRoaXMub1J1bGVzID0geFJ1bGVzO1xuICAgICAgICBkZWJ1Z2xvZyhcInJ1bGVzIFwiICsgSlNPTi5zdHJpbmdpZnkodGhpcy5vUnVsZXMpKTtcbiAgICB9XG4gICAgO1xuICAgIHJlY29nbml6ZShjb250ZXh0LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgdSA9IHt9O1xuICAgICAgICB2YXIgdGV4dCA9IGNvbnRleHQubWVzc2FnZS50ZXh0O1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHZhciByID0gY2hlY2tGb3JMZW5ndGgodGV4dCk7XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nKFwicnVsZXMgXCIgKyBKU09OLnN0cmluZ2lmeSh0aGlzLm9SdWxlcykpO1xuICAgICAgICB2YXIgdGV4dCA9IHRyaW1UcmFpbGluZ1NlbnRlbmNlRGVsaW1pdGVycyh0ZXh0KTtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBPYmplY3Qua2V5cyh0aGlzLm9SdWxlcykubWFwKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgICAgICB2YXIgdSA9IHJlY29nbml6ZVRleHQodGV4dCwgdGhhdC5vUnVsZXNbc0tleV0pO1xuICAgICAgICAgICAgaWYgKHUpIHtcbiAgICAgICAgICAgICAgICB1LmludGVudCA9IHNLZXk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdSA/IHUgOiB1bmRlZmluZWQ7XG4gICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbiAobykgeyByZXR1cm4gISFvOyB9KTtcbiAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgLyogVE9ETyBhYmlndW91cyAqL1xuICAgICAgICAgICAgZGVidWdsb2coXCJhbWJpZ3VvdXMgcmVzdWx0IGZvciA+XCIgKyB0ZXh0ICsgXCI8XCIgKyBKU09OLnN0cmluZ2lmeShyZXMpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgcmVzID0gcmVzdWx0c1swXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgcmVzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1Z2xvZygncmVjb2duaXppbmcgbm90aGluZycpO1xuICAgICAgICB1LmludGVudCA9IFwiTm9uZVwiO1xuICAgICAgICB1LnNjb3JlID0gMC4xO1xuICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICBlMS5zY29yZSA9IDAuMTtcbiAgICAgICAgdS5lbnRpdGllcyA9IFtdO1xuICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgIH1cbn0gLy8gY2xhc3NcbmV4cG9ydHMuUmVnRXhwUmVjb2duaXplciA9IFJlZ0V4cFJlY29nbml6ZXI7XG4iLCJcbi8qKlxuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICogQGZpbGUgcGxhaW5yZWNvZ25pemVyLnRzXG4gKlxuICogQSByZWNvZ25pemVyIHBhcmFtZXRyaXplZCBieSByZWdleCBleHByZXNzaW9uc1xuICovXG5cbmltcG9ydCAqIGFzIGJ1aWxkZXIgZnJvbSAnYm90YnVpbGRlcic7XG5pbXBvcnQgKiBhcyBJbnB1dEZpbHRlciBmcm9tICcuLi9tYXRjaC9pbnB1dEZpbHRlcic7XG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvaWZtYXRjaCc7XG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdwbGFpbnJlY29nbml6ZXInKTtcblxuY29uc3QgQW55T2JqZWN0ID0gT2JqZWN0IGFzIGFueTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlY29nbml6ZShzU3RyaW5nLCBtUnVsZXM6IEFycmF5PElNYXRjaC5JbnRlbnRSdWxlPikge1xuICB2YXIgcmVzID0gdW5kZWZpbmVkO1xuICBtUnVsZXMuZXZlcnkoZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgcmVzID0gbWF0Y2hSZWd1bGFyRXhwcmVzc2lvbihzU3RyaW5nLCBvUnVsZSk7XG4gICAgcmV0dXJuICFyZXM7XG4gIH0pXG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3VudFBhcmVuR3JvdXBzKHM6IHN0cmluZykge1xuICB2YXIgcmVzID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKHMuY2hhckF0KGkpID09PSAnKCcpIHtcbiAgICAgICsrcmVzO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG4vKipcbiAqIGdpdmVuIGEgc3RyaW5nLCBlLmcuXG4gKiBcIndobyBpcyB0aGUgPGNhdGVnb3J5PiBvZiA8QTE+XCIsXG4gKiBAcGFyYW0ge3N0cmluZ30gYVxuICogQHJldHVybnMge0lNYXRjaC5JUnVsZX0gYSByZWdleHAgcnVsZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VSdWxlU3RyaW5nKGE6IHN0cmluZyk6IElNYXRjaC5JbnRlbnRSdWxlIHtcbiAgdmFyIHMgPSBcIl5cIiArIGEgKyBcIiRcIjtcbiAgdmFyIGFyZ01hcHMgPSB7fTtcbiAgdmFyIG0gPSB1bmRlZmluZWQ7XG4gIHdoaWxlIChtID0gLzwoW14+XSspPihbP10/KS8uZXhlYyhzKSkge1xuICAgIHZhciBjYXQgPSBtWzFdO1xuICAgIHZhciBncmVlZHkgPSBtWzJdO1xuICAgIHZhciBwb3MgPSAxICsgY291bnRQYXJlbkdyb3VwcyhzLnN1YnN0cmluZygwLCBtLmluZGV4KSk7XG4gICAgaWYoZ3JlZWR5KSB7XG4gICAgICBzID0gcy5yZXBsYWNlKFwiPFwiICsgY2F0ICsgXCI+P1wiLCBcIiguKj8pXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHMgPSBzLnJlcGxhY2UoXCI8XCIgKyBjYXQgKyBcIj5cIiwgXCIoLiopXCIpO1xuICAgICAgfVxuICAgIGlmIChhcmdNYXBzW2NhdF0pIHtcbiAgICAgIHRocm93IEVycm9yKFwiTW9kZWwgZXJyb3IgZHVwbGljYXRlIGVudHJ5IVwiKVxuICAgIH1cbiAgICBhcmdNYXBzW2NhdF0gPSBwb3M7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAxLFxuICAgIHJlZ2V4cDogbmV3IFJlZ0V4cChzLCBcImlcIiksXG4gICAgYXJnc01hcDogYXJnTWFwc1xuICB9O1xufVxuXG5cbi8qKlxuICogZ2l2ZW4gYSBzdHJpbmcsIGUuZy5cbiAqIFwid2hvIGlzIHRoZSA8Y2F0ZWdvcnk+IG9mIDxBMT5cIixcbiAqIEBwYXJhbSB7c3RyaW5nfSBhXG4gKiBAcmV0dXJucyB7SU1hdGNoLklSdWxlfSBhIHJlZ2V4cCBydWxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVJ1bGVBcnJheShhOiBBcnJheTxhbnk+KTogSU1hdGNoLkludGVudFJ1bGUge1xuICB2YXIgcyA9IFwiXlwiICsgYSArIFwiJFwiO1xuICB2YXIgciA9IGFbMF07XG4gIGlmKHR5cGVvZiBhWzBdID09PSBcInN0cmluZ1wiKSB7XG4gICAgciA9IG5ldyBSZWdFeHAoYVswXSxcImlcIik7XG4gIH1cbiAgaWYgKCEociBpbnN0YW5jZW9mIFJlZ0V4cCkpIHtcbiAgICB0aHJvdyBFcnJvcihcImlsbGVnYWwgc3RhdGVcIiArIEpTT04uc3RyaW5naWZ5KGEpKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIHR5cGU6IDEsXG4gICAgcmVnZXhwOiByLFxuICAgIGFyZ3NNYXA6IGFbMV1cbiAgfTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VSdWxlKGE6IGFueSk6IElNYXRjaC5JbnRlbnRSdWxlIHtcbiAgaWYgKHR5cGVvZiBhID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBwYXJzZVJ1bGVTdHJpbmcoYSk7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShhKSkge1xuICAgIHJldHVybiBwYXJzZVJ1bGVBcnJheShhKTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHJ1bGUgZGVmaW5pdGlvblwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlUnVsZXMob0pTT046IHsgW2tleTogc3RyaW5nXTogYW55IH0pOiB7IFtrZXk6IHN0cmluZ106IEFycmF5PElNYXRjaC5JbnRlbnRSdWxlPiB9IHtcbiAgdmFyIHJlcyA9IHt9O1xuICBPYmplY3Qua2V5cyhvSlNPTikuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgIHJlc1tzS2V5XSA9IG9KU09OW3NLZXldLm1hcChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgIHJldHVybiBwYXJzZVJ1bGUob1J1bGUpO1xuICAgIH0pXG4gIH0pO1xuICByZXR1cm4gcmVzO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHRyaW1WYWx1ZUFkanVzdGluZyh2YWx1ZSA6IHN0cmluZykgOiB7IGRlbHRhU3RhcnQgOm51bWJlciwgdmFsdWUgOiBzdHJpbmd9IHtcbiAgdmFyIHJlcyA9IHsgZGVsdGFTdGFydCA6IDAsIHZhbHVlIDogdmFsdWUgfTtcbiAgdmFyIG0gPSB2YWx1ZS5tYXRjaCgvXlxccysvKTtcbiAgaWYobSkge1xuICAgIHJlcy5kZWx0YVN0YXJ0ID0gbVswXS5sZW5ndGg7XG4gICAgdmFsdWUgPSB2YWx1ZS5zdWJzdHIocmVzLmRlbHRhU3RhcnQpO1xuICB9XG4gIG0gPSB2YWx1ZS5tYXRjaCgvXFxzKyQvKTtcbiAgaWYobSkge1xuICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyKDAsIHZhbHVlLmxlbmd0aCAtIG1bMF0ubGVuZ3RoKTtcbiAgfVxuICByZXMudmFsdWUgPSB2YWx1ZTtcbiAgcmV0dXJuIHJlcztcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAocyA6IHN0cmluZywgbWF0Y2g6IEFycmF5PHN0cmluZz4sIGFyZ3NNYXA6IHsgW2tleTogc3RyaW5nXTogbnVtYmVyIH0pOiBBcnJheTxidWlsZGVyLklFbnRpdHk+IHtcbiAgaWYgKCFhcmdzTWFwKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIHZhciByZXN1bHQgPSBbXTtcbiAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgIHZhciByZXMgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgdmFyIGluZGV4ID0gYXJnc01hcFtzS2V5XTtcbiAgICB2YXIgdmFsdWUgPSBtYXRjaFtpbmRleF1cbiAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgcmVzLnR5cGUgPSBzS2V5O1xuICAgICAgcmVzLmVudGl0eSA9IHZhbHVlO1xuICAgICAgcmVzLnN0YXJ0SW5kZXggPSBzLmluZGV4T2YodmFsdWUpOyAvLyB0aGlzIG1heSBub3QgYmUgcHJlY2lzZVxuICAgICAgdmFyIHRyaW1BZGp1c3QgPSB0cmltVmFsdWVBZGp1c3RpbmcodmFsdWUpO1xuICAgICAgcmVzLnN0YXJ0SW5kZXggKz0gdHJpbUFkanVzdC5kZWx0YVN0YXJ0O1xuICAgICAgcmVzLmVudGl0eSA9IHRyaW1BZGp1c3QudmFsdWU7XG4gICAgICByZXMuZW5kSW5kZXggPSByZXMuc3RhcnRJbmRleCArIHRyaW1BZGp1c3QudmFsdWUubGVuZ3RoO1xuICAgICAgLy9yZXNbc0tleV0gPSB2YWx1ZVxuICAgICAgcmVzdWx0LnB1c2gocmVzKTtcbiAgICB9XG4gIH1cbiAgKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVndWxhckV4cHJlc3Npb24odGV4dCA6IHN0cmluZywgb1J1bGUgOiBJTWF0Y2guSW50ZW50UnVsZSkgOiBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0IHtcbiAgZGVidWdsb2coXCJyZWdleHAgaXMgXCIgKyBvUnVsZS5yZWdleHAudG9TdHJpbmcoKSk7XG4gIGRlYnVnbG9nKFwiIHRleHQgaXMgXCIgKyB0ZXh0KTtcbiAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyh0ZXh0KTtcbiAgaWYgKCFtKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICB2YXIgcmVzID0ge30gYXMgYnVpbGRlci5JSW50ZW50UmVjb2duaXplclJlc3VsdDtcbiAgcmVzLmVudGl0aWVzID0gZXh0cmFjdEFyZ3NNYXAodGV4dCwgbSwgb1J1bGUuYXJnc01hcCk7XG4gIHJlcy5zY29yZSA9IDAuOTtcbiAgZGVidWdsb2coXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcbiAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICByZXR1cm4gcmVzO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiB0cmltVHJhaWxpbmdTZW50ZW5jZURlbGltaXRlcnModGV4dCA6IHN0cmluZykgOiBzdHJpbmcge1xuICB2YXIgbSA9IC8oWyEuOywgP118XFxzKSskLy5leGVjKHRleHQpO1xuICBpZiAobSkge1xuICAgIHRleHQgPSB0ZXh0LnN1YnN0cigwLHRleHQubGVuZ3RoLSBtWzBdLmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIHRleHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVXaGl0ZXNwYWNlKHRleHQgOiBzdHJpbmcpIDogc3RyaW5nIHtcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvXFxzKy9nLCcgJyk7XG4gIHJldHVybiB0ZXh0O1xufVxuXG4vKipcbiAqIEdpdmVuYSBzdHJpbmcsIHJlcGxhY2UgYWxsIFwiLi4uLi5cIiAgd2l0aCA8d29yZD5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhY3RRdW90ZWQodGV4dDogc3RyaW5nKSA6IHN0cmluZyB7XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1wiW15cIl0rXCIvZywgXCI8d29yZD5cIik7XG4gIHJldHVybiB0ZXh0O1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjb3VudENvbXBhY3RXb3Jkcyh0ZXh0OiBzdHJpbmcpIDogbnVtYmVyIHtcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvLC9nLCAnICcpO1xuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8gXFxzKy9nLCAnICcpO1xuICByZXR1cm4gdGV4dC5zcGxpdChcIiBcIikubGVuZ3RoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tGb3JMZW5ndGgodGV4dCkgOiBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0IHtcbiAgICB2YXIgdGV4dFN0cmlwcGVkID0gdHJpbVRyYWlsaW5nU2VudGVuY2VEZWxpbWl0ZXJzKHRleHQpO1xuICAgIGlmKCh0ZXh0U3RyaXBwZWQubGVuZ3RoID4gMjAwKSB8fCAoY291bnRDb21wYWN0V29yZHMoY29tcGFjdFF1b3RlZCh0ZXh0KSkgPiAyMCkpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGludGVudDogXCJUb29Mb25nXCIsXG4gICAgICAgIHNjb3JlIDogMS4wLFxuICAgICAgICBlbnRpdGllcyA6IFtdXG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVjb2duaXplVGV4dCh0ZXh0IDogc3RyaW5nLCBhUnVsZXMgOiBBcnJheTxJTWF0Y2guSW50ZW50UnVsZT4pIDogYnVpbGRlci5JSW50ZW50UmVjb2duaXplclJlc3VsdHtcbiAgICB2YXIgcmVzID0gdW5kZWZpbmVkO1xuICAgIGFSdWxlcy5ldmVyeShmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgcmVzID0gbWF0Y2hSZWd1bGFyRXhwcmVzc2lvbih0ZXh0LCBvUnVsZSk7XG4gICAgICAgIHJldHVybiAhcmVzO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBjbGFzcyBSZWdFeHBSZWNvZ25pemVyIGltcGxlbWVudHMgYnVpbGRlci5JSW50ZW50UmVjb2duaXplciB7XG4gIG9SdWxlczogeyBba2V5OiBzdHJpbmddOiBBcnJheTxJTWF0Y2guSW50ZW50UnVsZT4gfTtcblxuICBjb25zdHJ1Y3Rvcih4UnVsZXM6IHsgW2tleTogc3RyaW5nXTogQXJyYXk8SU1hdGNoLkludGVudFJ1bGU+IH0pIHtcbiAgICB0aGlzLm9SdWxlcyA9IHhSdWxlcztcbiAgICBkZWJ1Z2xvZyhcInJ1bGVzIFwiICsgSlNPTi5zdHJpbmdpZnkodGhpcy5vUnVsZXMpKTtcbiAgfTtcblxuICByZWNvZ25pemUoY29udGV4dDogYnVpbGRlci5JUmVjb2duaXplQ29udGV4dCwgY2FsbGJhY2s6IChlcnI6IEVycm9yLCByZXN1bHQ6IGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXJSZXN1bHQpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB2YXIgdSA9IHt9IGFzIGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXJSZXN1bHQ7XG4gICAgdmFyIHRleHQgPSBjb250ZXh0Lm1lc3NhZ2UudGV4dDtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHIgPSBjaGVja0Zvckxlbmd0aCh0ZXh0KTtcbiAgICBpZihyKSB7XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQscik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGRlYnVnbG9nKFwicnVsZXMgXCIgKyBKU09OLnN0cmluZ2lmeSh0aGlzLm9SdWxlcykpO1xuXG4gICAgdmFyIHRleHQgPSB0cmltVHJhaWxpbmdTZW50ZW5jZURlbGltaXRlcnModGV4dCk7XG5cbiAgICB2YXIgcmVzdWx0cyA9IE9iamVjdC5rZXlzKHRoaXMub1J1bGVzKS5tYXAoZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgIHZhciB1ID0gcmVjb2duaXplVGV4dCh0ZXh0LCB0aGF0Lm9SdWxlc1tzS2V5XSk7XG4gICAgICBpZiAodSkge1xuICAgICAgICB1LmludGVudCA9IHNLZXk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdSA/ICB1IDogdW5kZWZpbmVkO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAobykgeyByZXR1cm4gISFvOyB9KTtcbiAgICBpZiAocmVzdWx0cy5sZW5ndGggPiAxKSB7XG4gICAgICAvKiBUT0RPIGFiaWd1b3VzICovXG4gICAgICBkZWJ1Z2xvZyhcImFtYmlndW91cyByZXN1bHQgZm9yID5cIiArIHRleHQgKyBcIjxcIiArIEpTT04uc3RyaW5naWZ5KHJlcykpO1xuICAgIH1cbiAgICBpZiAocmVzdWx0cy5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgcmVzID0gcmVzdWx0c1swXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgcmVzKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZGVidWdsb2coJ3JlY29nbml6aW5nIG5vdGhpbmcnKTtcbiAgICB1LmludGVudCA9IFwiTm9uZVwiO1xuICAgIHUuc2NvcmUgPSAwLjE7XG4gICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgIGUxLnNjb3JlID0gMC4xO1xuICAgIHUuZW50aXRpZXMgPSBbXTtcbiAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICB9XG59IC8vIGNsYXNzXG5cblxuXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
