"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fdevsta_monmove_1 = require("fdevsta_monmove");
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
exports.EnumRuleType = fdevsta_monmove_1.IFModel.EnumRuleType;
//export { IFModel.IModels as IModels } from 'fdevsta_monmove';
/*

export interface IModels {
    full : {
      domain : { [key : string] : {
          description: string,
          bitindex : number,
          categories : { [key : string] : ICategoryDesc }
        }
      }
    },
    rawModels : { [key : string] : IModel};
    domains: string[],
    tools: ITool[],
    category: string[],
    operators : { [key: string] : IOperator },
    mRules: mRule[],
    rules : SplitRules,
    records: any[]
    seenRules?: { [key: string]: mRule[] },
    meta : {
        // entity -> relation -> target
        t3 : { [key: string] : { [key : string] : any }}
    }
}
*/ 

//# sourceMappingURL=ifmatch.js.map
