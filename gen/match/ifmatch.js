"use strict";
(function (EnumResponseCode) {
    EnumResponseCode[EnumResponseCode["NOMATCH"] = 0] = "NOMATCH";
    EnumResponseCode[EnumResponseCode["EXEC"] = 1] = "EXEC";
    EnumResponseCode[EnumResponseCode["QUERY"] = 2] = "QUERY";
})(exports.EnumResponseCode || (exports.EnumResponseCode = {}));
var EnumResponseCode = exports.EnumResponseCode;
exports.CAT_CATEGORY = "category";
exports.CAT_FILLER = "filler";
exports.CAT_TOOL = "tool";
(function (EnumRuleType) {
    EnumRuleType[EnumRuleType["WORD"] = 0] = "WORD";
    EnumRuleType[EnumRuleType["REGEXP"] = 1] = "REGEXP";
})(exports.EnumRuleType || (exports.EnumRuleType = {}));
var EnumRuleType = exports.EnumRuleType;
(function (EnumActionType) {
    EnumActionType[EnumActionType["STARTURL"] = 0] = "STARTURL";
    EnumActionType[EnumActionType["STARTCMDLINE"] = 1] = "STARTCMDLINE";
})(exports.EnumActionType || (exports.EnumActionType = {}));
var EnumActionType = exports.EnumActionType;

//# sourceMappingURL=ifmatch.js.map
