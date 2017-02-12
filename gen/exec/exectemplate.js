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
var debug = require("debug");
var debuglog = debug('exectemplate');
function expandTemplate(context, template) {
    var pattern = template;
    Object.keys(context).forEach(function (sKey) {
        var regex = new RegExp('{' + sKey + '}', 'g');
        pattern = pattern.replace(regex, context[sKey]);
        pattern = pattern.replace(regex, context[sKey]);
    });
    return pattern;
}
exports.expandTemplate = expandTemplate;
function extractReplacementKeys(stemplate) {
    var regex = new RegExp('{([^}]+)}', "g");
    var keys = {};
    var m;
    while (m = regex.exec(stemplate)) {
        var pattern = m[1];
        keys[pattern] = 1;
    }
    return Object.keys(keys).sort();
}
exports.extractReplacementKeys = extractReplacementKeys;

//# sourceMappingURL=exectemplate.js.map
