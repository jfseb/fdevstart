"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IMatch = require("./ifmatch");
const pg = require("pg");
const debug = require("debug");
const debuglog = debug('indexwords');
var pgInstance = pg;
function mockPG(pg) {
    pgInstance = pg;
}
exports.mockPG = mockPG;
var columns = ['lowercaseword', 'matchedstring', 'category'];
function insertWord(dburl, lowercaseword, matchedstring, category, callback) {
    pgInstance.connect(dburl, (err, client, pgDone) => {
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
        }
        else {
            var query = `INSERT INTO words (` + columns.join(",") + ") " +
                //   (convid, sessionid, user, message, response, meta) ` +
                "VALUES ( " +
                // $1, $2, ...
                columns.map(function (o, iIndex) { return "$" + (iIndex + 1); }).join(", ") + ")";
            var values = columns.map(function (sCol) {
                return oEntry[sCol];
            });
            //  [level, msg, meta instanceof Array ? JSON.stringify(meta) : meta],
            client.query(query, values, (err, result) => {
                pgDone();
                if (err) {
                    // logger.emit('error', err);
                    debuglog('Error inserting record into db ' + err + '\n' +
                        values.join("\n"));
                    callback(err);
                }
                else {
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
            insertWord(dburl, mRule.lowercaseword, mRule.matchedString, mRule.category, function () { });
        }
    });
}
exports.dumpWords = dumpWords;

//# sourceMappingURL=indexwords.js.map
