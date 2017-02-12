"use strict";
var EnumResponseCode;
(function (EnumResponseCode) {
    EnumResponseCode[EnumResponseCode["NOMATCH"] = 0] = "NOMATCH";
    EnumResponseCode[EnumResponseCode["EXEC"] = 1] = "EXEC";
    EnumResponseCode[EnumResponseCode["QUERY"] = 2] = "QUERY";
})(EnumResponseCode = exports.EnumResponseCode || (exports.EnumResponseCode = {}));
exports.CAT_CATEGORY = "category";
exports.CAT_FILLER = "filler";
exports.CAT_TOOL = "tool";
exports.ERR_NO_KNOWN_WORD = "NO_KNOWN_WORD";
exports.ERR_EMPTY_INPUT = "EMPTY_INPUT";
;
;
exports.aOperatorNames = ["starting with", "ending with", "containing", "excluding", "having", "being"];
;
var EnumRuleType;
(function (EnumRuleType) {
    EnumRuleType[EnumRuleType["WORD"] = 0] = "WORD";
    EnumRuleType[EnumRuleType["REGEXP"] = 1] = "REGEXP";
})(EnumRuleType = exports.EnumRuleType || (exports.EnumRuleType = {}));
;
;
;
;
;
;
var EnumActionType;
(function (EnumActionType) {
    EnumActionType[EnumActionType["STARTURL"] = 0] = "STARTURL";
    EnumActionType[EnumActionType["STARTCMDLINE"] = 1] = "STARTCMDLINE";
})(EnumActionType = exports.EnumActionType || (exports.EnumActionType = {}));
;

//# sourceMappingURL=ifmatch.js.map
