"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2luZGV4d29yZHMuanMiLCIuLi9zcmMvbWF0Y2gvaW5kZXh3b3Jkcy50cyJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsIklNYXRjaCIsInJlcXVpcmUiLCJwZyIsImRlYnVnIiwiZGVidWdsb2ciLCJwZ0luc3RhbmNlIiwibW9ja1BHIiwiY29sdW1ucyIsImluc2VydFdvcmQiLCJkYnVybCIsImxvd2VyY2FzZXdvcmQiLCJtYXRjaGVkc3RyaW5nIiwiY2F0ZWdvcnkiLCJjYWxsYmFjayIsImNvbm5lY3QiLCJlcnIiLCJjbGllbnQiLCJwZ0RvbmUiLCJvRW50cnkiLCJxdWVyeSIsImpvaW4iLCJtYXAiLCJvIiwiaUluZGV4IiwidmFsdWVzIiwic0NvbCIsInJlc3VsdCIsImR1bXBXb3JkcyIsIm1vZGVsIiwibVJ1bGVzIiwiZm9yRWFjaCIsIm1SdWxlIiwidHlwZSIsIkVudW1SdWxlVHlwZSIsIldPUkQiLCJtYXRjaGVkU3RyaW5nIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQUEsT0FBT0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkMsRUFBRUMsT0FBTyxJQUFULEVBQTdDO0FDRUEsSUFBQUMsU0FBQUMsUUFBQSxXQUFBLENBQUE7QUFDQSxJQUFBQyxLQUFBRCxRQUFBLElBQUEsQ0FBQTtBQUNBLElBQUFFLFFBQUFGLFFBQUEsT0FBQSxDQUFBO0FBRUEsSUFBTUcsV0FBV0QsTUFBTSxZQUFOLENBQWpCO0FBRUEsSUFBSUUsYUFBYUgsRUFBakI7QUFFQSxTQUFBSSxNQUFBLENBQXVCSixFQUF2QixFQUF5QjtBQUN2QkcsaUJBQWFILEVBQWI7QUFDRDtBQUZESixRQUFBUSxNQUFBLEdBQUFBLE1BQUE7QUFJQSxJQUFJQyxVQUFVLENBQUMsZUFBRCxFQUFrQixlQUFsQixFQUFtQyxVQUFuQyxDQUFkO0FBQ0EsU0FBQUMsVUFBQSxDQUEyQkMsS0FBM0IsRUFBMENDLGFBQTFDLEVBQWtFQyxhQUFsRSxFQUEwRkMsUUFBMUYsRUFBNEdDLFFBQTVHLEVBQTJKO0FBQ3pKUixlQUFXUyxPQUFYLENBQW1CTCxLQUFuQixFQUEwQixVQUFDTSxHQUFELEVBQU1DLE1BQU4sRUFBMEJDLE1BQTFCLEVBQWdDO0FBQ3RELFlBQUlDLFNBQVU7QUFDWlAsMkJBQWdCQSxhQURKO0FBRVpELDJCQUFnQkEsYUFGSjtBQUdaRSxzQkFBV0E7QUFIQyxTQUFkO0FBS0EsWUFBSUcsR0FBSixFQUFTO0FBQ1A7QUFDQTtBQUNBWCxxQkFBUywyQkFBMkJXLEdBQXBDO0FBQ0FGLHFCQUFTRSxHQUFUO0FBQ0QsU0FMRCxNQUtPO0FBQ0wsZ0JBQUlJLFFBQU8sd0JBQXdCWixRQUFRYSxJQUFSLENBQWEsR0FBYixDQUF4QixHQUE0QyxJQUE1QztBQUNYO0FBQ0EsdUJBRlc7QUFHWDtBQUNDYixvQkFBUWMsR0FBUixDQUFZLFVBQVNDLENBQVQsRUFBV0MsTUFBWCxFQUFpQjtBQUFJLHVCQUFPLE9BQU9BLFNBQU8sQ0FBZCxDQUFQO0FBQTBCLGFBQTNELEVBQTZESCxJQUE3RCxDQUFrRSxJQUFsRSxDQUpVLEdBSWdFLEdBSjNFO0FBTUEsZ0JBQUlJLFNBQVNqQixRQUFRYyxHQUFSLENBQVksVUFBU0ksSUFBVCxFQUFhO0FBQ2pDLHVCQUFPUCxPQUFPTyxJQUFQLENBQVA7QUFDRCxhQUZTLENBQWI7QUFHRztBQUNIVCxtQkFBT0csS0FBUCxDQUFhQSxLQUFiLEVBQW1CSyxNQUFuQixFQUNhLFVBQUNULEdBQUQsRUFBTVcsTUFBTixFQUFZO0FBQ3JCVDtBQUNBLG9CQUFJRixHQUFKLEVBQVM7QUFDUjtBQUNBWCw2QkFBUyxvQ0FBb0NXLEdBQXBDLEdBQTBDLElBQTFDLEdBQ05TLE9BQU9KLElBQVAsQ0FBWSxJQUFaLENBREg7QUFFQ1AsNkJBQVNFLEdBQVQ7QUFDRCxpQkFMRCxNQUtPO0FBQ1A7QUFDRUYsNkJBQVMsSUFBVCxFQUFlLElBQWY7QUFDRDtBQUNKLGFBWkQ7QUFhRDtBQUNGLEtBcENIO0FBcUNEO0FBdENEZixRQUFBVSxVQUFBLEdBQUFBLFVBQUE7QUF5Q0EsU0FBQW1CLFNBQUEsQ0FBMEJsQixLQUExQixFQUEyQ21CLEtBQTNDLEVBQWdFO0FBQzlEO0FBQ0FBLFVBQU1DLE1BQU4sQ0FBYUMsT0FBYixDQUFxQixVQUFTQyxLQUFULEVBQWM7QUFDakMsWUFBR0EsTUFBTUMsSUFBTixLQUFlaEMsT0FBT2lDLFlBQVAsQ0FBb0JDLElBQXRDLEVBQTRDO0FBQzFDMUIsdUJBQVdDLEtBQVgsRUFBa0JzQixNQUFNckIsYUFBeEIsRUFBdUNxQixNQUFNSSxhQUE3QyxFQUE0REosTUFBTW5CLFFBQWxFLEVBQTRFLFlBQUEsQ0FBYSxDQUF6RjtBQUNEO0FBQ0YsS0FKRDtBQU1EO0FBUkRkLFFBQUE2QixTQUFBLEdBQUFBLFNBQUEiLCJmaWxlIjoibWF0Y2gvaW5kZXh3b3Jkcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgSU1hdGNoID0gcmVxdWlyZShcIi4vaWZtYXRjaFwiKTtcbmNvbnN0IHBnID0gcmVxdWlyZShcInBnXCIpO1xuY29uc3QgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdpbmRleHdvcmRzJyk7XG52YXIgcGdJbnN0YW5jZSA9IHBnO1xuZnVuY3Rpb24gbW9ja1BHKHBnKSB7XG4gICAgcGdJbnN0YW5jZSA9IHBnO1xufVxuZXhwb3J0cy5tb2NrUEcgPSBtb2NrUEc7XG52YXIgY29sdW1ucyA9IFsnbG93ZXJjYXNld29yZCcsICdtYXRjaGVkc3RyaW5nJywgJ2NhdGVnb3J5J107XG5mdW5jdGlvbiBpbnNlcnRXb3JkKGRidXJsLCBsb3dlcmNhc2V3b3JkLCBtYXRjaGVkc3RyaW5nLCBjYXRlZ29yeSwgY2FsbGJhY2spIHtcbiAgICBwZ0luc3RhbmNlLmNvbm5lY3QoZGJ1cmwsIChlcnIsIGNsaWVudCwgcGdEb25lKSA9PiB7XG4gICAgICAgIHZhciBvRW50cnkgPSB7XG4gICAgICAgICAgICBtYXRjaGVkc3RyaW5nOiBtYXRjaGVkc3RyaW5nLFxuICAgICAgICAgICAgbG93ZXJjYXNld29yZDogbG93ZXJjYXNld29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeVxuICAgICAgICB9O1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAvLyBmYWlsZWQgdG8gYWNxdWlyZSBjb25uZWN0aW9uXG4gICAgICAgICAgICAvL2xvZ2dlci5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnRXJyb3IgY29ubmVjdGluZyB0byBkYicgKyBlcnIpO1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBxdWVyeSA9IGBJTlNFUlQgSU5UTyB3b3JkcyAoYCArIGNvbHVtbnMuam9pbihcIixcIikgKyBcIikgXCIgK1xuICAgICAgICAgICAgICAgIC8vICAgKGNvbnZpZCwgc2Vzc2lvbmlkLCB1c2VyLCBtZXNzYWdlLCByZXNwb25zZSwgbWV0YSkgYCArXG4gICAgICAgICAgICAgICAgXCJWQUxVRVMgKCBcIiArXG4gICAgICAgICAgICAgICAgLy8gJDEsICQyLCAuLi5cbiAgICAgICAgICAgICAgICBjb2x1bW5zLm1hcChmdW5jdGlvbiAobywgaUluZGV4KSB7IHJldHVybiBcIiRcIiArIChpSW5kZXggKyAxKTsgfSkuam9pbihcIiwgXCIpICsgXCIpXCI7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gY29sdW1ucy5tYXAoZnVuY3Rpb24gKHNDb2wpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb0VudHJ5W3NDb2xdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyAgW2xldmVsLCBtc2csIG1ldGEgaW5zdGFuY2VvZiBBcnJheSA/IEpTT04uc3RyaW5naWZ5KG1ldGEpIDogbWV0YV0sXG4gICAgICAgICAgICBjbGllbnQucXVlcnkocXVlcnksIHZhbHVlcywgKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgcGdEb25lKCk7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAvLyBsb2dnZXIuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnRXJyb3IgaW5zZXJ0aW5nIHJlY29yZCBpbnRvIGRiICcgKyBlcnIgKyAnXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuam9pbihcIlxcblwiKSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyAgbG9nZ2VyLmVtaXQoJ2xvZ2dlZCcpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuZXhwb3J0cy5pbnNlcnRXb3JkID0gaW5zZXJ0V29yZDtcbmZ1bmN0aW9uIGR1bXBXb3JkcyhkYnVybCwgbW9kZWwpIHtcbiAgICAvLyBtb3ZlXG4gICAgbW9kZWwubVJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG1SdWxlKSB7XG4gICAgICAgIGlmIChtUnVsZS50eXBlID09PSBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQpIHtcbiAgICAgICAgICAgIGluc2VydFdvcmQoZGJ1cmwsIG1SdWxlLmxvd2VyY2FzZXdvcmQsIG1SdWxlLm1hdGNoZWRTdHJpbmcsIG1SdWxlLmNhdGVnb3J5LCBmdW5jdGlvbiAoKSB7IH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5leHBvcnRzLmR1bXBXb3JkcyA9IGR1bXBXb3JkcztcbiIsIlxuXG5cbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xuaW1wb3J0ICogYXMgcGcgZnJvbSAncGcnO1xuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xuXG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdpbmRleHdvcmRzJyk7XG5cbnZhciBwZ0luc3RhbmNlID0gcGc7XG5cbmV4cG9ydCBmdW5jdGlvbiBtb2NrUEcocGcpIHtcbiAgcGdJbnN0YW5jZSA9IHBnO1xufVxuXG52YXIgY29sdW1ucyA9IFsnbG93ZXJjYXNld29yZCcsICdtYXRjaGVkc3RyaW5nJywgJ2NhdGVnb3J5J107XG5leHBvcnQgZnVuY3Rpb24gaW5zZXJ0V29yZChkYnVybCA6IHN0cmluZyxsb3dlcmNhc2V3b3JkIDogc3RyaW5nLCBtYXRjaGVkc3RyaW5nIDogc3RyaW5nLCBjYXRlZ29yeTogc3RyaW5nLCBjYWxsYmFjayA6IChlcnI6IEVycm9yLCByZXM/IDogYm9vbGVhbikgPT4gdm9pZCApIHtcbiAgcGdJbnN0YW5jZS5jb25uZWN0KGRidXJsLCAoZXJyLCBjbGllbnQgOiBwZy5DbGllbnQsIHBnRG9uZSkgPT4ge1xuICAgICAgdmFyIG9FbnRyeSA9ICB7XG4gICAgICAgIG1hdGNoZWRzdHJpbmcgOiBtYXRjaGVkc3RyaW5nLFxuICAgICAgICBsb3dlcmNhc2V3b3JkIDogbG93ZXJjYXNld29yZCxcbiAgICAgICAgY2F0ZWdvcnkgOiBjYXRlZ29yeVxuICAgICAgfVxuICAgICAgaWYgKGVycikge1xuICAgICAgICAvLyBmYWlsZWQgdG8gYWNxdWlyZSBjb25uZWN0aW9uXG4gICAgICAgIC8vbG9nZ2VyLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgZGVidWdsb2coJ0Vycm9yIGNvbm5lY3RpbmcgdG8gZGInICsgZXJyKTtcbiAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBxdWVyeSA9YElOU0VSVCBJTlRPIHdvcmRzIChgICsgY29sdW1ucy5qb2luKFwiLFwiKSArIFwiKSBcIiArXG4gICAgICAgIC8vICAgKGNvbnZpZCwgc2Vzc2lvbmlkLCB1c2VyLCBtZXNzYWdlLCByZXNwb25zZSwgbWV0YSkgYCArXG4gICAgICAgIFwiVkFMVUVTICggXCIgICtcbiAgICAgICAgLy8gJDEsICQyLCAuLi5cbiAgICAgICAgIGNvbHVtbnMubWFwKGZ1bmN0aW9uKG8saUluZGV4KSB7IHJldHVybiBcIiRcIiArIChpSW5kZXgrMSk7IH0pLmpvaW4oXCIsIFwiKSArIFwiKVwiO1xuXG4gICAgICAgIHZhciB2YWx1ZXMgPSBjb2x1bW5zLm1hcChmdW5jdGlvbihzQ29sKSB7XG4gICAgICAgICAgICAgcmV0dXJuIG9FbnRyeVtzQ29sXTtcbiAgICAgICAgICAgfSk7XG4gICAgICAgICAgIC8vICBbbGV2ZWwsIG1zZywgbWV0YSBpbnN0YW5jZW9mIEFycmF5ID8gSlNPTi5zdHJpbmdpZnkobWV0YSkgOiBtZXRhXSxcbiAgICAgICAgY2xpZW50LnF1ZXJ5KHF1ZXJ5LHZhbHVlcyxcbiAgICAgICAgICAgICAgICAgICAgIChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgcGdEb25lKCk7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgLy8gbG9nZ2VyLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICAgICBkZWJ1Z2xvZygnRXJyb3IgaW5zZXJ0aW5nIHJlY29yZCBpbnRvIGRiICcgKyBlcnIgKyAnXFxuJyArXG4gICAgICAgICAgICAgICAgdmFsdWVzLmpvaW4oXCJcXG5cIikpO1xuICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vICBsb2dnZXIuZW1pdCgnbG9nZ2VkJyk7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZHVtcFdvcmRzKGRidXJsIDogc3RyaW5nLCAgbW9kZWw6IElNYXRjaC5JTW9kZWxzKSB7XG4gIC8vIG1vdmVcbiAgbW9kZWwubVJ1bGVzLmZvckVhY2goZnVuY3Rpb24obVJ1bGUpIHtcbiAgICBpZihtUnVsZS50eXBlID09PSBJTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQpIHtcbiAgICAgIGluc2VydFdvcmQoZGJ1cmwsIG1SdWxlLmxvd2VyY2FzZXdvcmQsIG1SdWxlLm1hdGNoZWRTdHJpbmcsIG1SdWxlLmNhdGVnb3J5LCBmdW5jdGlvbigpIHt9KTtcbiAgICB9XG4gIH0pO1xuXG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
