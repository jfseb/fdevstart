"use strict";
/**
 * @file operator
 * @module jfseb.fdevstart.operator
 * @copyright (c) Gerd Forstmann
 *
 * Operator implementation
 *
 * These functions expose parf the underlying model,
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Note: both arguments are expected to be lowercased
 */
function matches(operator, fragmentLC, strLC) {
    if (!strLC) {
        return false;
    }
    switch (operator.operator) {
        case "starting with":
            return strLC.indexOf(fragmentLC) === 0;
        case "containing":
            return strLC.indexOf(fragmentLC) >= 0;
        case "ending with":
            return strLC.length >= fragmentLC.length &&
                strLC.substring(strLC.length - fragmentLC.length) === fragmentLC;
        default:
            throw new Error('Unknown operator or illegal operator usage: ' + operator.operator);
    }
    //return false;
}
exports.matches = matches;

//# sourceMappingURL=operator.js.map
