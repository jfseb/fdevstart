"use strict";
/**
 * a logger for dialog conversations
 */
//declare module pg {};
Object.defineProperty(exports, "__esModule", { value: true });
const debug = require("debug");
const process = require("process");
exports.sqlActive = !!(process.env.ABOT_LOGDB);
const debuglog = debug('dialoglogger');
;
;
const columns = ["botid", "userid", "message", "response", "action", "intent", "conversationid", "meta", "delta"];
// 0 indicates do not process /truncate, e.g. non string type
const columnLengths = [10, 40, 1024, 1024, 512, 20, 40, 0, 0];
function assureColumnLengthNotExceeded(obj) {
    columns.forEach(function (sCol, iIndex) {
        if (columnLengths[iIndex] && typeof obj[sCol] !== "string") {
            debuglog("Unexpected non-string value " + JSON.stringify(obj[sCol]));
            obj[sCol] = "" + obj[sCol];
        }
        if (obj[sCol] && columnLengths[iIndex] && obj[sCol].length > columnLengths[iIndex]) {
            obj[sCol] = obj[sCol].substring(0, columnLengths[iIndex]);
        }
    });
    return obj;
}
exports.assureColumnLengthNotExceeded = assureColumnLengthNotExceeded;
function logAnswer(answer, callback, ForceSqlActive) {
    "use strict";
    callback = callback || (function () { });
    var session = answer.session;
    var sqlIsActive = ForceSqlActive || exports.sqlActive;
    var pg = this.pg;
    debuglog("here user id of message session.message.address " +
        JSON.stringify(session.message.address.user));
    var oLogEntry = {
        botid: (session.message && session.message.address && session.message.address.bot && session.message.address.bot.id) || this.name,
        userid: session.message.address
            && session.message.address.user
            && session.message.address.user.id || "",
        message: session.message.text,
        response: answer.response,
        action: answer.action,
        intent: answer.intent,
        conversationid: session.message.address
            && session.message.address.conversation
            && session.message.address.conversation.id || "",
        meta: answer.result || {},
        delta: Date.now() - Date.parse(session.message.timestamp),
    };
    oLogEntry = assureColumnLengthNotExceeded(oLogEntry);
    debuglog("sqlIsActive" + sqlIsActive);
    if (!sqlIsActive) {
        return;
    }
    pg.connect(this.dburl, (err, client, pgDone) => {
        if (err) {
            // failed to acquire connection
            //logger.emit('error', err);
            debuglog('Error connecting to db' + err);
            callback(err);
        }
        else {
            var query = `INSERT INTO logconv (` + columns.join(",") + ") " +
                //   (convid, sessionid, user, message, response, meta) ` +
                "VALUES ( " +
                // $1, $2, ...
                columns.map(function (o, iIndex) { return "$" + (iIndex + 1); }).join(", ") + ")";
            var values = columns.map(function (sCol) {
                return oLogEntry[sCol];
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
exports.logAnswer = logAnswer;
var loggers = {};
function logger(name, dburl, pg) {
    if (!dburl) {
        throw new Error('need database url');
    }
    if (typeof name !== "string" || !/^[A-Za-z][A-Za-z0-9_]+$/.exec(name)) {
        throw new Error('Logger name must be at least two alphanumeric characters');
    }
    if (!loggers[name]) {
        var alogger = {
            name: name,
            dburl: dburl,
            pg: pg
        };
        alogger.logIt = logAnswer.bind(alogger);
        loggers[name] = alogger;
    }
    if (loggers[name].dburl !== dburl) {
        throw new Error('Flags mismatch in logger' + name);
    }
    return loggers[name].logIt;
}
exports.logger = logger;

//# sourceMappingURL=dialoglogger.js.map
