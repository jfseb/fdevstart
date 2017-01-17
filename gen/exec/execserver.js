/**
 * Functionality to execute a certain response on the server,
 * interpreting a general model context
 *
 *
 * via a) commandline (e.g. browser startup)
 * @file
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";
var debug = require('debug');
var debuglog = debug('execserver');
var Toolmatch = require('../match/toolmatch');
var Exectemplate = require('./exectemplate');
function noStar(a, b) {
    if (b === '*') {
        return a;
    }
    if (a === '*') {
        return b;
    }
    if (a !== b) {
        throw new Error('Illegal Argument no match ' + a + " " + b);
    }
    return b;
}
exports.noStar = noStar;
function makeGenericText(match, setId, record) {
    var res = "start " + match.tool.name;
    var set = match.tool.sets[setId];
    var context = Toolmatch.makeMatchSet(match, set);
    set.set.forEach(function (category, index) {
        var value = noStar(context[category], record[category]);
        var prefix = "";
        if (index === 0) {
            prefix += ' using ';
        }
        else if (index === set.set.length - 1) {
            prefix += ' and ';
        }
        else {
            prefix = '; ';
        }
        if (category === "category") {
            res = res + prefix + '"' + value + '"';
        }
        res = res + prefix + category + ' "' + value + '"';
    });
    return res;
}
exports.makeGenericText = makeGenericText;
function execTool(match, records, bExplain) {
    //
    debuglog("records for match " + JSON.stringify(match));
    var matchSetRecord = Toolmatch.findFirstSetRecord(match, records);
    if (!matchSetRecord) {
        return {
            text: "cannot start",
            action: {}
        };
    }
    ;
    var set = match.tool.sets[matchSetRecord.setId];
    var pattern = matchSetRecord.record[set.response];
    var context = Toolmatch.makeMatchSet(match, set);
    var url = Exectemplate.expandTemplate(context, pattern);
    var text = "";
    debuglog("record " + JSON.stringify("matchSetRecord "));
    var patternText = matchSetRecord.record["_text" + set.response];
    if (patternText) {
        text = Exectemplate.expandTemplate(context, patternText);
    }
    else {
        text = makeGenericText(match, matchSetRecord.setId, matchSetRecord.record);
    }
    return {
        text: text,
        action: { url: url }
    };
}
exports.execTool = execTool;

//# sourceMappingURL=execserver.js.map
