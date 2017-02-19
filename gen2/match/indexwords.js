"use strict";

var IMatch = require("./ifmatch");
var pg = require("pg");
var debug = require("debug");
var debuglog = debug('indexwords');
var pgInstance = pg;
function mockPG(pg) {
    pgInstance = pg;
}
exports.mockPG = mockPG;
var columns = ['lowercaseword', 'matchedstring', 'category'];
function insertWord(dburl, lowercaseword, matchedstring, category, callback) {
    pgInstance.connect(dburl, function (err, client, pgDone) {
        var oEntry = {
            matchedstring: matchedstring,
            lowercaseword: lowercaseword,
            category: category
        };
        if (err) {
            // failed to acquire connection
            //logger.emit('error', err);
            debuglog('Error connecting to db' + err);
            callback(err);
        } else {
            var query = "INSERT INTO words (" + columns.join(",") + ") " +
            //   (convid, sessionid, user, message, response, meta) ` +
            "VALUES ( " +
            // $1, $2, ...
            columns.map(function (o, iIndex) {
                return "$" + (iIndex + 1);
            }).join(", ") + ")";
            var values = columns.map(function (sCol) {
                return oEntry[sCol];
            });
            //  [level, msg, meta instanceof Array ? JSON.stringify(meta) : meta],
            client.query(query, values, function (err, result) {
                pgDone();
                if (err) {
                    // logger.emit('error', err);
                    debuglog('Error inserting record into db ' + err + '\n' + values.join("\n"));
                    callback(err);
                } else {
                    //  logger.emit('logged');
                    callback(null, true);
                }
            });
        }
    });
}
exports.insertWord = insertWord;
function dumpWords(dburl, model) {
    // move
    model.mRules.forEach(function (mRule) {
        if (mRule.type === IMatch.EnumRuleType.WORD) {
            insertWord(dburl, mRule.lowercaseword, mRule.matchedString, mRule.category, function () {});
        }
    });
}
exports.dumpWords = dumpWords;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2luZGV4d29yZHMuanMiLCIuLi9zcmMvbWF0Y2gvaW5kZXh3b3Jkcy50cyJdLCJuYW1lcyI6WyJJTWF0Y2giLCJyZXF1aXJlIiwicGciLCJkZWJ1ZyIsImRlYnVnbG9nIiwicGdJbnN0YW5jZSIsIm1vY2tQRyIsImV4cG9ydHMiLCJjb2x1bW5zIiwiaW5zZXJ0V29yZCIsImRidXJsIiwibG93ZXJjYXNld29yZCIsIm1hdGNoZWRzdHJpbmciLCJjYXRlZ29yeSIsImNhbGxiYWNrIiwiY29ubmVjdCIsImVyciIsImNsaWVudCIsInBnRG9uZSIsIm9FbnRyeSIsInF1ZXJ5Iiwiam9pbiIsIm1hcCIsIm8iLCJpSW5kZXgiLCJ2YWx1ZXMiLCJzQ29sIiwicmVzdWx0IiwiZHVtcFdvcmRzIiwibW9kZWwiLCJtUnVsZXMiLCJmb3JFYWNoIiwibVJ1bGUiLCJ0eXBlIiwiRW51bVJ1bGVUeXBlIiwiV09SRCIsIm1hdGNoZWRTdHJpbmciXSwibWFwcGluZ3MiOiJBQUFBOztBQ0dBLElBQUFBLFNBQUFDLFFBQUEsV0FBQSxDQUFBO0FBQ0EsSUFBQUMsS0FBQUQsUUFBQSxJQUFBLENBQUE7QUFDQSxJQUFBRSxRQUFBRixRQUFBLE9BQUEsQ0FBQTtBQUVBLElBQU1HLFdBQVdELE1BQU0sWUFBTixDQUFqQjtBQUVBLElBQUlFLGFBQWFILEVBQWpCO0FBRUEsU0FBQUksTUFBQSxDQUF1QkosRUFBdkIsRUFBeUI7QUFDdkJHLGlCQUFhSCxFQUFiO0FBQ0Q7QUFGREssUUFBQUQsTUFBQSxHQUFBQSxNQUFBO0FBSUEsSUFBSUUsVUFBVSxDQUFDLGVBQUQsRUFBa0IsZUFBbEIsRUFBbUMsVUFBbkMsQ0FBZDtBQUNBLFNBQUFDLFVBQUEsQ0FBMkJDLEtBQTNCLEVBQTBDQyxhQUExQyxFQUFrRUMsYUFBbEUsRUFBMEZDLFFBQTFGLEVBQTRHQyxRQUE1RyxFQUEySjtBQUN6SlQsZUFBV1UsT0FBWCxDQUFtQkwsS0FBbkIsRUFBMEIsVUFBQ00sR0FBRCxFQUFNQyxNQUFOLEVBQTBCQyxNQUExQixFQUFnQztBQUN0RCxZQUFJQyxTQUFVO0FBQ1pQLDJCQUFnQkEsYUFESjtBQUVaRCwyQkFBZ0JBLGFBRko7QUFHWkUsc0JBQVdBO0FBSEMsU0FBZDtBQUtBLFlBQUlHLEdBQUosRUFBUztBQUNQO0FBQ0E7QUFDQVoscUJBQVMsMkJBQTJCWSxHQUFwQztBQUNBRixxQkFBU0UsR0FBVDtBQUNELFNBTEQsTUFLTztBQUNMLGdCQUFJSSxRQUFPLHdCQUF3QlosUUFBUWEsSUFBUixDQUFhLEdBQWIsQ0FBeEIsR0FBNEMsSUFBNUM7QUFDWDtBQUNBLHVCQUZXO0FBR1g7QUFDQ2Isb0JBQVFjLEdBQVIsQ0FBWSxVQUFTQyxDQUFULEVBQVdDLE1BQVgsRUFBaUI7QUFBSSx1QkFBTyxPQUFPQSxTQUFPLENBQWQsQ0FBUDtBQUEwQixhQUEzRCxFQUE2REgsSUFBN0QsQ0FBa0UsSUFBbEUsQ0FKVSxHQUlnRSxHQUozRTtBQU1BLGdCQUFJSSxTQUFTakIsUUFBUWMsR0FBUixDQUFZLFVBQVNJLElBQVQsRUFBYTtBQUNqQyx1QkFBT1AsT0FBT08sSUFBUCxDQUFQO0FBQ0QsYUFGUyxDQUFiO0FBR0c7QUFDSFQsbUJBQU9HLEtBQVAsQ0FBYUEsS0FBYixFQUFtQkssTUFBbkIsRUFDYSxVQUFDVCxHQUFELEVBQU1XLE1BQU4sRUFBWTtBQUNyQlQ7QUFDQSxvQkFBSUYsR0FBSixFQUFTO0FBQ1I7QUFDQVosNkJBQVMsb0NBQW9DWSxHQUFwQyxHQUEwQyxJQUExQyxHQUNOUyxPQUFPSixJQUFQLENBQVksSUFBWixDQURIO0FBRUNQLDZCQUFTRSxHQUFUO0FBQ0QsaUJBTEQsTUFLTztBQUNQO0FBQ0VGLDZCQUFTLElBQVQsRUFBZSxJQUFmO0FBQ0Q7QUFDSixhQVpEO0FBYUQ7QUFDRixLQXBDSDtBQXFDRDtBQXRDRFAsUUFBQUUsVUFBQSxHQUFBQSxVQUFBO0FBeUNBLFNBQUFtQixTQUFBLENBQTBCbEIsS0FBMUIsRUFBMkNtQixLQUEzQyxFQUFnRTtBQUM5RDtBQUNBQSxVQUFNQyxNQUFOLENBQWFDLE9BQWIsQ0FBcUIsVUFBU0MsS0FBVCxFQUFjO0FBQ2pDLFlBQUdBLE1BQU1DLElBQU4sS0FBZWpDLE9BQU9rQyxZQUFQLENBQW9CQyxJQUF0QyxFQUE0QztBQUMxQzFCLHVCQUFXQyxLQUFYLEVBQWtCc0IsTUFBTXJCLGFBQXhCLEVBQXVDcUIsTUFBTUksYUFBN0MsRUFBNERKLE1BQU1uQixRQUFsRSxFQUE0RSxZQUFBLENBQWEsQ0FBekY7QUFDRDtBQUNGLEtBSkQ7QUFNRDtBQVJETixRQUFBcUIsU0FBQSxHQUFBQSxTQUFBIiwiZmlsZSI6Im1hdGNoL2luZGV4d29yZHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbnZhciBJTWF0Y2ggPSByZXF1aXJlKFwiLi9pZm1hdGNoXCIpO1xudmFyIHBnID0gcmVxdWlyZShcInBnXCIpO1xudmFyIGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ2luZGV4d29yZHMnKTtcbnZhciBwZ0luc3RhbmNlID0gcGc7XG5mdW5jdGlvbiBtb2NrUEcocGcpIHtcbiAgICBwZ0luc3RhbmNlID0gcGc7XG59XG5leHBvcnRzLm1vY2tQRyA9IG1vY2tQRztcbnZhciBjb2x1bW5zID0gWydsb3dlcmNhc2V3b3JkJywgJ21hdGNoZWRzdHJpbmcnLCAnY2F0ZWdvcnknXTtcbmZ1bmN0aW9uIGluc2VydFdvcmQoZGJ1cmwsIGxvd2VyY2FzZXdvcmQsIG1hdGNoZWRzdHJpbmcsIGNhdGVnb3J5LCBjYWxsYmFjaykge1xuICAgIHBnSW5zdGFuY2UuY29ubmVjdChkYnVybCwgZnVuY3Rpb24gKGVyciwgY2xpZW50LCBwZ0RvbmUpIHtcbiAgICAgICAgdmFyIG9FbnRyeSA9IHtcbiAgICAgICAgICAgIG1hdGNoZWRzdHJpbmc6IG1hdGNoZWRzdHJpbmcsXG4gICAgICAgICAgICBsb3dlcmNhc2V3b3JkOiBsb3dlcmNhc2V3b3JkLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5XG4gICAgICAgIH07XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIC8vIGZhaWxlZCB0byBhY3F1aXJlIGNvbm5lY3Rpb25cbiAgICAgICAgICAgIC8vbG9nZ2VyLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICAgIGRlYnVnbG9nKCdFcnJvciBjb25uZWN0aW5nIHRvIGRiJyArIGVycik7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHF1ZXJ5ID0gXCJJTlNFUlQgSU5UTyB3b3JkcyAoXCIgKyBjb2x1bW5zLmpvaW4oXCIsXCIpICsgXCIpIFwiICtcbiAgICAgICAgICAgICAgICAvLyAgIChjb252aWQsIHNlc3Npb25pZCwgdXNlciwgbWVzc2FnZSwgcmVzcG9uc2UsIG1ldGEpIGAgK1xuICAgICAgICAgICAgICAgIFwiVkFMVUVTICggXCIgK1xuICAgICAgICAgICAgICAgIC8vICQxLCAkMiwgLi4uXG4gICAgICAgICAgICAgICAgY29sdW1ucy5tYXAoZnVuY3Rpb24gKG8sIGlJbmRleCkgeyByZXR1cm4gXCIkXCIgKyAoaUluZGV4ICsgMSk7IH0pLmpvaW4oXCIsIFwiKSArIFwiKVwiO1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IGNvbHVtbnMubWFwKGZ1bmN0aW9uIChzQ29sKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9FbnRyeVtzQ29sXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gIFtsZXZlbCwgbXNnLCBtZXRhIGluc3RhbmNlb2YgQXJyYXkgPyBKU09OLnN0cmluZ2lmeShtZXRhKSA6IG1ldGFdLFxuICAgICAgICAgICAgY2xpZW50LnF1ZXJ5KHF1ZXJ5LCB2YWx1ZXMsIGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHBnRG9uZSgpO1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbG9nZ2VyLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coJ0Vycm9yIGluc2VydGluZyByZWNvcmQgaW50byBkYiAnICsgZXJyICsgJ1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzLmpvaW4oXCJcXG5cIikpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gIGxvZ2dlci5lbWl0KCdsb2dnZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbmV4cG9ydHMuaW5zZXJ0V29yZCA9IGluc2VydFdvcmQ7XG5mdW5jdGlvbiBkdW1wV29yZHMoZGJ1cmwsIG1vZGVsKSB7XG4gICAgLy8gbW92ZVxuICAgIG1vZGVsLm1SdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChtUnVsZSkge1xuICAgICAgICBpZiAobVJ1bGUudHlwZSA9PT0gSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JEKSB7XG4gICAgICAgICAgICBpbnNlcnRXb3JkKGRidXJsLCBtUnVsZS5sb3dlcmNhc2V3b3JkLCBtUnVsZS5tYXRjaGVkU3RyaW5nLCBtUnVsZS5jYXRlZ29yeSwgZnVuY3Rpb24gKCkgeyB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuZXhwb3J0cy5kdW1wV29yZHMgPSBkdW1wV29yZHM7XG4iLCJcblxuXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcbmltcG9ydCAqIGFzIHBnIGZyb20gJ3BnJztcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcblxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnaW5kZXh3b3JkcycpO1xuXG52YXIgcGdJbnN0YW5jZSA9IHBnO1xuXG5leHBvcnQgZnVuY3Rpb24gbW9ja1BHKHBnKSB7XG4gIHBnSW5zdGFuY2UgPSBwZztcbn1cblxudmFyIGNvbHVtbnMgPSBbJ2xvd2VyY2FzZXdvcmQnLCAnbWF0Y2hlZHN0cmluZycsICdjYXRlZ29yeSddO1xuZXhwb3J0IGZ1bmN0aW9uIGluc2VydFdvcmQoZGJ1cmwgOiBzdHJpbmcsbG93ZXJjYXNld29yZCA6IHN0cmluZywgbWF0Y2hlZHN0cmluZyA6IHN0cmluZywgY2F0ZWdvcnk6IHN0cmluZywgY2FsbGJhY2sgOiAoZXJyOiBFcnJvciwgcmVzPyA6IGJvb2xlYW4pID0+IHZvaWQgKSB7XG4gIHBnSW5zdGFuY2UuY29ubmVjdChkYnVybCwgKGVyciwgY2xpZW50IDogcGcuQ2xpZW50LCBwZ0RvbmUpID0+IHtcbiAgICAgIHZhciBvRW50cnkgPSAge1xuICAgICAgICBtYXRjaGVkc3RyaW5nIDogbWF0Y2hlZHN0cmluZyxcbiAgICAgICAgbG93ZXJjYXNld29yZCA6IGxvd2VyY2FzZXdvcmQsXG4gICAgICAgIGNhdGVnb3J5IDogY2F0ZWdvcnlcbiAgICAgIH1cbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgLy8gZmFpbGVkIHRvIGFjcXVpcmUgY29ubmVjdGlvblxuICAgICAgICAvL2xvZ2dlci5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICAgIGRlYnVnbG9nKCdFcnJvciBjb25uZWN0aW5nIHRvIGRiJyArIGVycik7XG4gICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcXVlcnkgPWBJTlNFUlQgSU5UTyB3b3JkcyAoYCArIGNvbHVtbnMuam9pbihcIixcIikgKyBcIikgXCIgK1xuICAgICAgICAvLyAgIChjb252aWQsIHNlc3Npb25pZCwgdXNlciwgbWVzc2FnZSwgcmVzcG9uc2UsIG1ldGEpIGAgK1xuICAgICAgICBcIlZBTFVFUyAoIFwiICArXG4gICAgICAgIC8vICQxLCAkMiwgLi4uXG4gICAgICAgICBjb2x1bW5zLm1hcChmdW5jdGlvbihvLGlJbmRleCkgeyByZXR1cm4gXCIkXCIgKyAoaUluZGV4KzEpOyB9KS5qb2luKFwiLCBcIikgKyBcIilcIjtcblxuICAgICAgICB2YXIgdmFsdWVzID0gY29sdW1ucy5tYXAoZnVuY3Rpb24oc0NvbCkge1xuICAgICAgICAgICAgIHJldHVybiBvRW50cnlbc0NvbF07XG4gICAgICAgICAgIH0pO1xuICAgICAgICAgICAvLyAgW2xldmVsLCBtc2csIG1ldGEgaW5zdGFuY2VvZiBBcnJheSA/IEpTT04uc3RyaW5naWZ5KG1ldGEpIDogbWV0YV0sXG4gICAgICAgIGNsaWVudC5xdWVyeShxdWVyeSx2YWx1ZXMsXG4gICAgICAgICAgICAgICAgICAgICAoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgIHBnRG9uZSgpO1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgIC8vIGxvZ2dlci5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICAgICAgICAgZGVidWdsb2coJ0Vycm9yIGluc2VydGluZyByZWNvcmQgaW50byBkYiAnICsgZXJyICsgJ1xcbicgK1xuICAgICAgICAgICAgICAgIHZhbHVlcy5qb2luKFwiXFxuXCIpKTtcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyAgbG9nZ2VyLmVtaXQoJ2xvZ2dlZCcpO1xuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBXb3JkcyhkYnVybCA6IHN0cmluZywgIG1vZGVsOiBJTWF0Y2guSU1vZGVscykge1xuICAvLyBtb3ZlXG4gIG1vZGVsLm1SdWxlcy5mb3JFYWNoKGZ1bmN0aW9uKG1SdWxlKSB7XG4gICAgaWYobVJ1bGUudHlwZSA9PT0gSU1hdGNoLkVudW1SdWxlVHlwZS5XT1JEKSB7XG4gICAgICBpbnNlcnRXb3JkKGRidXJsLCBtUnVsZS5sb3dlcmNhc2V3b3JkLCBtUnVsZS5tYXRjaGVkU3RyaW5nLCBtUnVsZS5jYXRlZ29yeSwgZnVuY3Rpb24oKSB7fSk7XG4gICAgfVxuICB9KTtcblxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
