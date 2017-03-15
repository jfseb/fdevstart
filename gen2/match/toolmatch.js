/**
 * @file toolmatch
 * @module jfseb.fdevstart.toolmatch
 * @copyright (c) Gerd Forstmann
 *
 * Methods operating on a matched tool,
 *
 * This will unify matching required and optional category words
 * with the requirements of the tool.
 *
 */
"use strict";
// / <reference path="../../lib/node-4.d.ts" />

var debug = require("debug");
var debuglog = debug('toolmatch');
/*
var oToolFLP = {
  'name': 'FLP',
  'requires': { 'systemId': {}, 'client': {} },
  "optional": {
    "fiori intent": {}
  },
  "sets": {
    "intent": {
      "set": [
        "systemId",
        "client",
        "fiori intent"
      ],
      "response": "_urlpattern1"
    },
    "none": {
      "set": [
        "systemId",
        "client"
      ],
      "response": "_urlpattern2"
    }
  }
};
*/
var abot_erbase_1 = require("abot_erbase");
function cmpToolSet(sets, a, b) {
    return -(sets[a].set.length - sets[b].set.length);
}
/**
 * This onyl finds the best matching sets (=longest match)
 * independent of a record
 */
function findMatchingSets(a) {
    var matchingSets = Object.keys(a.tool.sets).filter(function (sSetKey) {
        var oSet = a.tool.sets[sSetKey];
        debuglog('here the set for tool ' + a.tool.name + " " + JSON.stringify(oSet));
        return oSet.set.every(function (category) {
            var word = abot_erbase_1.Sentence.findWordByCategory(a.sentence, category);
            var b = !!(word && word.word !== undefined);
            debuglog("searchign for category " + category + " " + b);
            return b;
        });
    });
    if (matchingSets.length === 0) {
        return []; // undefined;
    }
    var cmpThisToolSet = cmpToolSet.bind(undefined, a.tool.sets);
    matchingSets.sort(cmpThisToolSet);
    debuglog("best sets ordered " + matchingSets.join(","));
    matchingSets = matchingSets.filter(function (sKey) {
        if (!cmpThisToolSet(matchingSets[0], sKey)) {
            return true;
        }
        return false;
    });
    if (matchingSets.length > 1) {
        debuglog("More than one set matches: \"" + matchingSets.join('";"') + "for match:\n" + JSON.stringify(a, undefined, 2));
    }
    return matchingSets.sort();
}
exports.findMatchingSets = findMatchingSets;
function findBestMatchingSet(a) {
    var matchingSets = findMatchingSets(a);
    if (matchingSets && matchingSets.length) {
        return a.tool.sets[matchingSets[0]];
    }
    return undefined;
}
exports.findBestMatchingSet = findBestMatchingSet;
function isMatchingRecord(matchset, setcommand, record) {
    var res = Object.keys(matchset).every(function (category) {
        var value = matchset[category];
        if (value === record[category] || record[category] === '*') {
            return true;
        }
        return false;
    });
    if (!res) {
        return false;
    }
    if (!record[setcommand]) {
        // THROW?
        debuglog("Matching record lacks setcommand" + setcommand + " match:" + JSON.stringify(record) + " match " + JSON.stringify(matchset));
        return false;
    }
    return true;
}
exports.isMatchingRecord = isMatchingRecord;
function makeMatchSet(a, toolset) {
    var res = {};
    toolset.set.forEach(function (category) {
        res[category] = abot_erbase_1.Sentence.findWordByCategory(a.sentence, category).word.matchedString;
    });
    Object.freeze(res);
    return res;
}
exports.makeMatchSet = makeMatchSet;
function findSetRecords(a, setIds, aRecords) {
    var res = [];
    setIds.forEach(function (setId) {
        var set = a.tool.sets[setId];
        var matchset = makeMatchSet(a, set);
        var filteredRecords = aRecords.filter(function (record) {
            return isMatchingRecord(matchset, set.response, record);
        });
        filteredRecords.forEach(function (record) {
            res.push({ setId: setId, record: record });
        });
    });
    // TODO SORT?
    return res;
}
exports.findSetRecords = findSetRecords;
function findFirstSetRecord(toolMatchResult, records) {
    var setIds = findMatchingSets(toolMatchResult);
    var res = findSetRecords(toolMatchResult, setIds, records);
    if (res) {
        return res[0];
    }
    return undefined;
}
exports.findFirstSetRecord = findFirstSetRecord;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC90b29sbWF0Y2gudHMiLCJtYXRjaC90b29sbWF0Y2guanMiXSwibmFtZXMiOlsiZGVidWciLCJyZXF1aXJlIiwiZGVidWdsb2ciLCJhYm90X2VyYmFzZV8xIiwiY21wVG9vbFNldCIsInNldHMiLCJhIiwiYiIsInNldCIsImxlbmd0aCIsImZpbmRNYXRjaGluZ1NldHMiLCJtYXRjaGluZ1NldHMiLCJPYmplY3QiLCJrZXlzIiwidG9vbCIsImZpbHRlciIsInNTZXRLZXkiLCJvU2V0IiwibmFtZSIsIkpTT04iLCJzdHJpbmdpZnkiLCJldmVyeSIsImNhdGVnb3J5Iiwid29yZCIsIlNlbnRlbmNlIiwiZmluZFdvcmRCeUNhdGVnb3J5Iiwic2VudGVuY2UiLCJ1bmRlZmluZWQiLCJjbXBUaGlzVG9vbFNldCIsImJpbmQiLCJzb3J0Iiwiam9pbiIsInNLZXkiLCJleHBvcnRzIiwiZmluZEJlc3RNYXRjaGluZ1NldCIsImlzTWF0Y2hpbmdSZWNvcmQiLCJtYXRjaHNldCIsInNldGNvbW1hbmQiLCJyZWNvcmQiLCJyZXMiLCJ2YWx1ZSIsIm1ha2VNYXRjaFNldCIsInRvb2xzZXQiLCJmb3JFYWNoIiwibWF0Y2hlZFN0cmluZyIsImZyZWV6ZSIsImZpbmRTZXRSZWNvcmRzIiwic2V0SWRzIiwiYVJlY29yZHMiLCJzZXRJZCIsImZpbHRlcmVkUmVjb3JkcyIsInJlc3BvbnNlIiwicHVzaCIsImZpbmRGaXJzdFNldFJlY29yZCIsInRvb2xNYXRjaFJlc3VsdCIsInJlY29yZHMiXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7OztBQ1dBO0FEQ0E7O0FBRUEsSUFBQUEsUUFBQUMsUUFBQSxPQUFBLENBQUE7QUFFQSxJQUFNQyxXQUFXRixNQUFNLFdBQU4sQ0FBakI7QUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUEyQkEsSUFBQUcsZ0JBQUFGLFFBQUEsYUFBQSxDQUFBO0FBRUEsU0FBQUcsVUFBQSxDQUFvQkMsSUFBcEIsRUFBNkNDLENB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QyxDQUFiLEVBQWdCRSxHQUFoQixDQUFmO0FBQ0EsWUFBSTBDLGtCQUFrQkYsU0FBU2pDLE1BQVQsQ0FBZ0IsVUFBU3VCLE1BQVQsRUFBZTtBQUNuRCxtQkFBT0gsaUJBQWlCQyxRQUFqQixFQUEyQjVCLElBQUkyQyxRQUEvQixFQUF5Q2IsTUFBekMsQ0FBUDtBQUNELFNBRnFCLENBQXRCO0FBR0FZLHdCQUFnQlAsT0FBaEIsQ0FBd0IsVUFBU0wsTUFBVCxFQUFlO0FBQ3JDQyxnQkFBSWEsSUFBSixDQUFTLEVBQUVILE9BQVFBLEtBQVYsRUFBaUJYLFFBQVFBLE1BQXpCLEVBQVQ7QUFDRCxTQUZEO0FBR0QsS0FURDtBQVVBO0FBQ0EsV0FBT0MsR0FBUDtBQUNEO0FBZEROLFFBQUFhLGNBQUEsR0FBQUEsY0FBQTtBQWdCQSxTQUFBTyxrQkFBQSxDQUFtQ0MsZUFBbkMsRUFBdUVDLE9BQXZFLEVBQWdHO0FBQzlGLFFBQUlSLFNBQVNyQyxpQkFBaUI0QyxlQUFqQixDQUFiO0FBQ0EsUUFBSWYsTUFBTU8sZUFBZVEsZUFBZixFQUFnQ1AsTUFBaEMsRUFBd0NRLE9BQXhDLENBQVY7QUFDQSxRQUFJaEIsR0FBSixFQUFTO0FBQ1AsZUFBT0EsSUFBSSxDQUFKLENBQVA7QUFDRDtBQUNELFdBQU9aLFNBQVA7QUFDRDtBQVBETSxRQUFBb0Isa0JBQUEsR0FBQUEsa0JBQUEiLCJmaWxlIjoibWF0Y2gvdG9vbG1hdGNoLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEBmaWxlIHRvb2xtYXRjaFxyXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC50b29sbWF0Y2hcclxuICogQGNvcHlyaWdodCAoYykgR2VyZCBGb3JzdG1hbm5cclxuICpcclxuICogTWV0aG9kcyBvcGVyYXRpbmcgb24gYSBtYXRjaGVkIHRvb2wsXHJcbiAqXHJcbiAqIFRoaXMgd2lsbCB1bmlmeSBtYXRjaGluZyByZXF1aXJlZCBhbmQgb3B0aW9uYWwgY2F0ZWdvcnkgd29yZHNcclxuICogd2l0aCB0aGUgcmVxdWlyZW1lbnRzIG9mIHRoZSB0b29sLlxyXG4gKlxyXG4gKi9cclxuXHJcbi8vIC8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuXHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4vaWZtYXRjaCc7XHJcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ3Rvb2xtYXRjaCcpO1xyXG5cclxuLypcclxudmFyIG9Ub29sRkxQID0ge1xyXG4gICduYW1lJzogJ0ZMUCcsXHJcbiAgJ3JlcXVpcmVzJzogeyAnc3lzdGVtSWQnOiB7fSwgJ2NsaWVudCc6IHt9IH0sXHJcbiAgXCJvcHRpb25hbFwiOiB7XHJcbiAgICBcImZpb3JpIGludGVudFwiOiB7fVxyXG4gIH0sXHJcbiAgXCJzZXRzXCI6IHtcclxuICAgIFwiaW50ZW50XCI6IHtcclxuICAgICAgXCJzZXRcIjogW1xyXG4gICAgICAgIFwic3lzdGVtSWRcIixcclxuICAgICAgICBcImNsaWVudFwiLFxyXG4gICAgICAgIFwiZmlvcmkgaW50ZW50XCJcclxuICAgICAgXSxcclxuICAgICAgXCJyZXNwb25zZVwiOiBcIl91cmxwYXR0ZXJuMVwiXHJcbiAgICB9LFxyXG4gICAgXCJub25lXCI6IHtcclxuICAgICAgXCJzZXRcIjogW1xyXG4gICAgICAgIFwic3lzdGVtSWRcIixcclxuICAgICAgICBcImNsaWVudFwiXHJcbiAgICAgIF0sXHJcbiAgICAgIFwicmVzcG9uc2VcIjogXCJfdXJscGF0dGVybjJcIlxyXG4gICAgfVxyXG4gIH1cclxufTtcclxuKi9cclxuXHJcbmltcG9ydCB7IFNlbnRlbmNlIGFzIFNlbnRlbmNlfSBmcm9tICdhYm90X2VyYmFzZSc7XHJcblxyXG5mdW5jdGlvbiBjbXBUb29sU2V0KHNldHMgOiBJTWF0Y2guSVRvb2xTZXRzLCBhIDogc3RyaW5nLCBiOnN0cmluZykge1xyXG4gIHJldHVybiAtKHNldHNbYV0uc2V0Lmxlbmd0aCAtIHNldHNbYl0uc2V0Lmxlbmd0aCk7XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogVGhpcyBvbnlsIGZpbmRzIHRoZSBiZXN0IG1hdGNoaW5nIHNldHMgKD1sb25nZXN0IG1hdGNoKVxyXG4gKiBpbmRlcGVuZGVudCBvZiBhIHJlY29yZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNYXRjaGluZ1NldHMoYSA6IElNYXRjaC5JVG9vbE1hdGNoICkgOiBzdHJpbmdbXSB7XHJcbiAgdmFyIG1hdGNoaW5nU2V0cyA9IE9iamVjdC5rZXlzKGEudG9vbC5zZXRzKS5maWx0ZXIoZnVuY3Rpb24oc1NldEtleSkge1xyXG4gICAgdmFyIG9TZXQgPSBhLnRvb2wuc2V0c1tzU2V0S2V5XTtcclxuICAgIGRlYnVnbG9nKCdoZXJlIHRoZSBzZXQgZm9yIHRvb2wgJyArIGEudG9vbC5uYW1lICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShvU2V0KSk7XHJcbiAgICByZXR1cm4gb1NldC5zZXQuZXZlcnkoZnVuY3Rpb24oY2F0ZWdvcnkgOiBzdHJpbmcpIDpib29sZWFuIHtcclxuICAgICAgdmFyIHdvcmQgPSBTZW50ZW5jZS5maW5kV29yZEJ5Q2F0ZWdvcnkoYS5zZW50ZW5jZSwgY2F0ZWdvcnkpO1xyXG4gICAgICB2YXIgYiA9ICEhKHdvcmQgJiYgKHdvcmQud29yZCAhPT0gdW5kZWZpbmVkKSk7XHJcbiAgICAgIGRlYnVnbG9nKFwic2VhcmNoaWduIGZvciBjYXRlZ29yeSBcIiArIGNhdGVnb3J5ICsgXCIgXCIgKyBiKTtcclxuICAgICAgcmV0dXJuIGI7XHJcbiAgICB9KTtcclxuICB9KTtcclxuICBpZihtYXRjaGluZ1NldHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICByZXR1cm4gW107IC8vIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgdmFyIGNtcFRoaXNUb29sU2V0ID0gY21wVG9vbFNldC5iaW5kKHVuZGVmaW5lZCwgYS50b29sLnNldHMpO1xyXG4gIG1hdGNoaW5nU2V0cy5zb3J0KGNtcFRoaXNUb29sU2V0KTtcclxuICBkZWJ1Z2xvZyhcImJlc3Qgc2V0cyBvcmRlcmVkIFwiICsgbWF0Y2hpbmdTZXRzLmpvaW4oXCIsXCIpKTtcclxuICBtYXRjaGluZ1NldHMgPSBtYXRjaGluZ1NldHMuZmlsdGVyKGZ1bmN0aW9uKHNLZXkpIHtcclxuICAgIGlmKCFjbXBUaGlzVG9vbFNldChtYXRjaGluZ1NldHNbMF0sc0tleSkpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfSk7XHJcbiAgaWYgKG1hdGNoaW5nU2V0cy5sZW5ndGggPiAxKSB7XHJcbiAgICBkZWJ1Z2xvZyhcIk1vcmUgdGhhbiBvbmUgc2V0IG1hdGNoZXM6IFxcXCJcIiArIG1hdGNoaW5nU2V0cy5qb2luKCdcIjtcIicpICsgXCJmb3IgbWF0Y2g6XFxuXCIgKyBKU09OLnN0cmluZ2lmeShhLCB1bmRlZmluZWQsMikpXHJcbiAgfVxyXG4gIHJldHVybiBtYXRjaGluZ1NldHMuc29ydCgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmluZEJlc3RNYXRjaGluZ1NldChhIDogSU1hdGNoLklUb29sTWF0Y2gpIDogSU1hdGNoLklUb29sU2V0IHtcclxuICB2YXIgbWF0Y2hpbmdTZXRzID0gZmluZE1hdGNoaW5nU2V0cyhhKTtcclxuICBpZihtYXRjaGluZ1NldHMgJiYgbWF0Y2hpbmdTZXRzLmxlbmd0aCkge1xyXG4gICAgcmV0dXJuIGEudG9vbC5zZXRzW21hdGNoaW5nU2V0c1swXV07XHJcbiAgfVxyXG4gIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaXNNYXRjaGluZ1JlY29yZCggbWF0Y2hzZXQgOiBJTWF0Y2guSU1hdGNoU2V0LCBzZXRjb21tYW5kIDogc3RyaW5nLCByZWNvcmQgOiBJTWF0Y2guSVJlY29yZCkge1xyXG5cclxuICB2YXIgcmVzID0gT2JqZWN0LmtleXMobWF0Y2hzZXQpLmV2ZXJ5KGZ1bmN0aW9uKGNhdGVnb3J5KSB7XHJcbiAgICB2YXIgdmFsdWUgPSBtYXRjaHNldFtjYXRlZ29yeV07XHJcbiAgICBpZiAoKHZhbHVlID09PSByZWNvcmRbY2F0ZWdvcnldKSB8fCAgKHJlY29yZFtjYXRlZ29yeV0gPT09ICcqJykpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfSk7XHJcbiAgaWYoIXJlcykge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuICBpZighcmVjb3JkW3NldGNvbW1hbmRdKSB7XHJcbiAgICAvLyBUSFJPVz9cclxuICAgIGRlYnVnbG9nKFwiTWF0Y2hpbmcgcmVjb3JkIGxhY2tzIHNldGNvbW1hbmRcIiArIHNldGNvbW1hbmQgKyBcIiBtYXRjaDpcIiArIEpTT04uc3RyaW5naWZ5KHJlY29yZCkgKyBcIiBtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoc2V0KSApXHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiB9XHJcbiAgcmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYWtlTWF0Y2hTZXQoYSA6IElNYXRjaC5JVG9vbE1hdGNoLCB0b29sc2V0IDogSU1hdGNoLklUb29sU2V0KSA6IElNYXRjaC5JTWF0Y2hTZXQge1xyXG4gIHZhciByZXMgPSB7fSBhcyBJTWF0Y2guSU1hdGNoU2V0O1xyXG4gIHRvb2xzZXQuc2V0LmZvckVhY2goZnVuY3Rpb24oY2F0ZWdvcnkpIHtcclxuICAgIHJlc1tjYXRlZ29yeV0gPSBTZW50ZW5jZS5maW5kV29yZEJ5Q2F0ZWdvcnkoYS5zZW50ZW5jZSwgY2F0ZWdvcnkpLndvcmQubWF0Y2hlZFN0cmluZztcclxuICB9KTtcclxuICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmaW5kU2V0UmVjb3JkcyhhIDogSU1hdGNoLklUb29sTWF0Y2gsIHNldElkcyA6IHN0cmluZ1tdLCBhUmVjb3JkcyA6IElNYXRjaC5JUmVjb3JkW10pIDogSU1hdGNoLklNYXRjaGVkU2V0UmVjb3JkcyB7XHJcbiAgdmFyIHJlcyA9IFtdIGFzIElNYXRjaC5JTWF0Y2hlZFNldFJlY29yZFtdO1xyXG4gIHNldElkcy5mb3JFYWNoKGZ1bmN0aW9uKHNldElkKSB7XHJcbiAgICB2YXIgc2V0ID0gYS50b29sLnNldHNbc2V0SWRdO1xyXG4gICAgdmFyIG1hdGNoc2V0ID0gbWFrZU1hdGNoU2V0KGEsIHNldCk7XHJcbiAgICB2YXIgZmlsdGVyZWRSZWNvcmRzID0gYVJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uKHJlY29yZCkge1xyXG4gICAgICByZXR1cm4gaXNNYXRjaGluZ1JlY29yZChtYXRjaHNldCwgc2V0LnJlc3BvbnNlLCByZWNvcmQpO1xyXG4gICAgfSlcclxuICAgIGZpbHRlcmVkUmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHJlY29yZCkge1xyXG4gICAgICByZXMucHVzaCh7IHNldElkIDogc2V0SWQsIHJlY29yZDogcmVjb3JkfSk7XHJcbiAgICB9KVxyXG4gIH0pXHJcbiAgLy8gVE9ETyBTT1JUP1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmaW5kRmlyc3RTZXRSZWNvcmQodG9vbE1hdGNoUmVzdWx0OiBJTWF0Y2guSVRvb2xNYXRjaCwgcmVjb3JkczogSU1hdGNoLklSZWNvcmRbXSkgOiBJTWF0Y2guSU1hdGNoZWRTZXRSZWNvcmQge1xyXG4gIHZhciBzZXRJZHMgPSBmaW5kTWF0Y2hpbmdTZXRzKHRvb2xNYXRjaFJlc3VsdCk7XHJcbiAgdmFyIHJlcyA9IGZpbmRTZXRSZWNvcmRzKHRvb2xNYXRjaFJlc3VsdCwgc2V0SWRzLCByZWNvcmRzKTtcclxuICBpZiAocmVzKSB7XHJcbiAgICByZXR1cm4gcmVzWzBdO1xyXG4gIH1cclxuICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcbiIsIi8qKlxuICogQGZpbGUgdG9vbG1hdGNoXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC50b29sbWF0Y2hcbiAqIEBjb3B5cmlnaHQgKGMpIEdlcmQgRm9yc3RtYW5uXG4gKlxuICogTWV0aG9kcyBvcGVyYXRpbmcgb24gYSBtYXRjaGVkIHRvb2wsXG4gKlxuICogVGhpcyB3aWxsIHVuaWZ5IG1hdGNoaW5nIHJlcXVpcmVkIGFuZCBvcHRpb25hbCBjYXRlZ29yeSB3b3Jkc1xuICogd2l0aCB0aGUgcmVxdWlyZW1lbnRzIG9mIHRoZSB0b29sLlxuICpcbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG4vLyAvIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XG52YXIgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG52YXIgZGVidWdsb2cgPSBkZWJ1ZygndG9vbG1hdGNoJyk7XG4vKlxudmFyIG9Ub29sRkxQID0ge1xuICAnbmFtZSc6ICdGTFAnLFxuICAncmVxdWlyZXMnOiB7ICdzeXN0ZW1JZCc6IHt9LCAnY2xpZW50Jzoge30gfSxcbiAgXCJvcHRpb25hbFwiOiB7XG4gICAgXCJmaW9yaSBpbnRlbnRcIjoge31cbiAgfSxcbiAgXCJzZXRzXCI6IHtcbiAgICBcImludGVudFwiOiB7XG4gICAgICBcInNldFwiOiBbXG4gICAgICAgIFwic3lzdGVtSWRcIixcbiAgICAgICAgXCJjbGllbnRcIixcbiAgICAgICAgXCJmaW9yaSBpbnRlbnRcIlxuICAgICAgXSxcbiAgICAgIFwicmVzcG9uc2VcIjogXCJfdXJscGF0dGVybjFcIlxuICAgIH0sXG4gICAgXCJub25lXCI6IHtcbiAgICAgIFwic2V0XCI6IFtcbiAgICAgICAgXCJzeXN0ZW1JZFwiLFxuICAgICAgICBcImNsaWVudFwiXG4gICAgICBdLFxuICAgICAgXCJyZXNwb25zZVwiOiBcIl91cmxwYXR0ZXJuMlwiXG4gICAgfVxuICB9XG59O1xuKi9cbnZhciBhYm90X2VyYmFzZV8xID0gcmVxdWlyZShcImFib3RfZXJiYXNlXCIpO1xuZnVuY3Rpb24gY21wVG9vbFNldChzZXRzLCBhLCBiKSB7XG4gICAgcmV0dXJuIC0oc2V0c1thXS5zZXQubGVuZ3RoIC0gc2V0c1tiXS5zZXQubGVuZ3RoKTtcbn1cbi8qKlxuICogVGhpcyBvbnlsIGZpbmRzIHRoZSBiZXN0IG1hdGNoaW5nIHNldHMgKD1sb25nZXN0IG1hdGNoKVxuICogaW5kZXBlbmRlbnQgb2YgYSByZWNvcmRcbiAqL1xuZnVuY3Rpb24gZmluZE1hdGNoaW5nU2V0cyhhKSB7XG4gICAgdmFyIG1hdGNoaW5nU2V0cyA9IE9iamVjdC5rZXlzKGEudG9vbC5zZXRzKS5maWx0ZXIoZnVuY3Rpb24gKHNTZXRLZXkpIHtcbiAgICAgICAgdmFyIG9TZXQgPSBhLnRvb2wuc2V0c1tzU2V0S2V5XTtcbiAgICAgICAgZGVidWdsb2coJ2hlcmUgdGhlIHNldCBmb3IgdG9vbCAnICsgYS50b29sLm5hbWUgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG9TZXQpKTtcbiAgICAgICAgcmV0dXJuIG9TZXQuc2V0LmV2ZXJ5KGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgdmFyIHdvcmQgPSBhYm90X2VyYmFzZV8xLlNlbnRlbmNlLmZpbmRXb3JkQnlDYXRlZ29yeShhLnNlbnRlbmNlLCBjYXRlZ29yeSk7XG4gICAgICAgICAgICB2YXIgYiA9ICEhKHdvcmQgJiYgKHdvcmQud29yZCAhPT0gdW5kZWZpbmVkKSk7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcInNlYXJjaGlnbiBmb3IgY2F0ZWdvcnkgXCIgKyBjYXRlZ29yeSArIFwiIFwiICsgYik7XG4gICAgICAgICAgICByZXR1cm4gYjtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKG1hdGNoaW5nU2V0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIFtdOyAvLyB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBjbXBUaGlzVG9vbFNldCA9IGNtcFRvb2xTZXQuYmluZCh1bmRlZmluZWQsIGEudG9vbC5zZXRzKTtcbiAgICBtYXRjaGluZ1NldHMuc29ydChjbXBUaGlzVG9vbFNldCk7XG4gICAgZGVidWdsb2coXCJiZXN0IHNldHMgb3JkZXJlZCBcIiArIG1hdGNoaW5nU2V0cy5qb2luKFwiLFwiKSk7XG4gICAgbWF0Y2hpbmdTZXRzID0gbWF0Y2hpbmdTZXRzLmZpbHRlcihmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICBpZiAoIWNtcFRoaXNUb29sU2V0KG1hdGNoaW5nU2V0c1swXSwgc0tleSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICBpZiAobWF0Y2hpbmdTZXRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZGVidWdsb2coXCJNb3JlIHRoYW4gb25lIHNldCBtYXRjaGVzOiBcXFwiXCIgKyBtYXRjaGluZ1NldHMuam9pbignXCI7XCInKSArIFwiZm9yIG1hdGNoOlxcblwiICsgSlNPTi5zdHJpbmdpZnkoYSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHJldHVybiBtYXRjaGluZ1NldHMuc29ydCgpO1xufVxuZXhwb3J0cy5maW5kTWF0Y2hpbmdTZXRzID0gZmluZE1hdGNoaW5nU2V0cztcbmZ1bmN0aW9uIGZpbmRCZXN0TWF0Y2hpbmdTZXQoYSkge1xuICAgIHZhciBtYXRjaGluZ1NldHMgPSBmaW5kTWF0Y2hpbmdTZXRzKGEpO1xuICAgIGlmIChtYXRjaGluZ1NldHMgJiYgbWF0Y2hpbmdTZXRzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gYS50b29sLnNldHNbbWF0Y2hpbmdTZXRzWzBdXTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMuZmluZEJlc3RNYXRjaGluZ1NldCA9IGZpbmRCZXN0TWF0Y2hpbmdTZXQ7XG5mdW5jdGlvbiBpc01hdGNoaW5nUmVjb3JkKG1hdGNoc2V0LCBzZXRjb21tYW5kLCByZWNvcmQpIHtcbiAgICB2YXIgcmVzID0gT2JqZWN0LmtleXMobWF0Y2hzZXQpLmV2ZXJ5KGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBtYXRjaHNldFtjYXRlZ29yeV07XG4gICAgICAgIGlmICgodmFsdWUgPT09IHJlY29yZFtjYXRlZ29yeV0pIHx8IChyZWNvcmRbY2F0ZWdvcnldID09PSAnKicpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgaWYgKCFyZXMpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIXJlY29yZFtzZXRjb21tYW5kXSkge1xuICAgICAgICAvLyBUSFJPVz9cbiAgICAgICAgZGVidWdsb2coXCJNYXRjaGluZyByZWNvcmQgbGFja3Mgc2V0Y29tbWFuZFwiICsgc2V0Y29tbWFuZCArIFwiIG1hdGNoOlwiICsgSlNPTi5zdHJpbmdpZnkocmVjb3JkKSArIFwiIG1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hzZXQpKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbmV4cG9ydHMuaXNNYXRjaGluZ1JlY29yZCA9IGlzTWF0Y2hpbmdSZWNvcmQ7XG5mdW5jdGlvbiBtYWtlTWF0Y2hTZXQoYSwgdG9vbHNldCkge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICB0b29sc2V0LnNldC5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICByZXNbY2F0ZWdvcnldID0gYWJvdF9lcmJhc2VfMS5TZW50ZW5jZS5maW5kV29yZEJ5Q2F0ZWdvcnkoYS5zZW50ZW5jZSwgY2F0ZWdvcnkpLndvcmQubWF0Y2hlZFN0cmluZztcbiAgICB9KTtcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMubWFrZU1hdGNoU2V0ID0gbWFrZU1hdGNoU2V0O1xuZnVuY3Rpb24gZmluZFNldFJlY29yZHMoYSwgc2V0SWRzLCBhUmVjb3Jkcykge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBzZXRJZHMuZm9yRWFjaChmdW5jdGlvbiAoc2V0SWQpIHtcbiAgICAgICAgdmFyIHNldCA9IGEudG9vbC5zZXRzW3NldElkXTtcbiAgICAgICAgdmFyIG1hdGNoc2V0ID0gbWFrZU1hdGNoU2V0KGEsIHNldCk7XG4gICAgICAgIHZhciBmaWx0ZXJlZFJlY29yZHMgPSBhUmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIGlzTWF0Y2hpbmdSZWNvcmQobWF0Y2hzZXQsIHNldC5yZXNwb25zZSwgcmVjb3JkKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGZpbHRlcmVkUmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKHsgc2V0SWQ6IHNldElkLCByZWNvcmQ6IHJlY29yZCB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgLy8gVE9ETyBTT1JUP1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmZpbmRTZXRSZWNvcmRzID0gZmluZFNldFJlY29yZHM7XG5mdW5jdGlvbiBmaW5kRmlyc3RTZXRSZWNvcmQodG9vbE1hdGNoUmVzdWx0LCByZWNvcmRzKSB7XG4gICAgdmFyIHNldElkcyA9IGZpbmRNYXRjaGluZ1NldHModG9vbE1hdGNoUmVzdWx0KTtcbiAgICB2YXIgcmVzID0gZmluZFNldFJlY29yZHModG9vbE1hdGNoUmVzdWx0LCBzZXRJZHMsIHJlY29yZHMpO1xuICAgIGlmIChyZXMpIHtcbiAgICAgICAgcmV0dXJuIHJlc1swXTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMuZmluZEZpcnN0U2V0UmVjb3JkID0gZmluZEZpcnN0U2V0UmVjb3JkO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
