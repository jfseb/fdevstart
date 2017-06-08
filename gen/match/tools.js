"use strict";
/**
 * @file toolmatcher
 * @module jfseb.fdevstart.toolmatcher
 * @copyright (c) Gerd Forstmann
 *
 * Match a tool record on a sentence,
 *
 * This will unify matching required and optional category words
 * with the requirements of the tool.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
var oToolFLPD = {
    'name': 'FLPD',
    'requires': { 'systemId': {}, 'client': {} },
    'optional': { 'fiori catalog': {}, 'fiori group': {} }
};
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
var oToolTA = {
    'name': 'StartTA',
    'requires': { 'transaction': {}, 'systemId': {}, 'client': {} },
    'optional': {}
};
var oToolWiki = {
    'name': 'wiki',
    'requires': { 'wiki': {} },
    'optional': { 'wikipage': {} }
};
var oToolUnitTest = {
    'name': 'unit test',
    'requires': { 'unit test': {} },
    optional: {}
};
const tools = [oToolWiki, oToolTA, oToolUnitTest, oToolFLPD, oToolFLP];
function cmpTools(a, b) {
    return a.name.localeCompare(b.name);
}
exports.cmpTools = cmpTools;
function getTools() {
    return tools.sort(cmpTools);
}
exports.getTools = getTools;
;
function findMatchingSet(a) {
}
exports.findMatchingSet = findMatchingSet;

//# sourceMappingURL=tools.js.map
