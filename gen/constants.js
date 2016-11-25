"use strict";
exports.EXEC_URL = 'all';
exports.EXEC_SHORTCUT = 'shortcut';
/**
 * Responses of a dispatcher
 */
(function (ResponseCode) {
    ResponseCode[ResponseCode["NOMATCH"] = 0] = "NOMATCH";
    ResponseCode[ResponseCode["EXEC"] = 1] = "EXEC";
    ResponseCode[ResponseCode["QUERY"] = 2] = "QUERY";
})(exports.ResponseCode || (exports.ResponseCode = {}));
var ResponseCode = exports.ResponseCode;

//# sourceMappingURL=constants.js.map
