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
;
(function (EnumRuleType) {
    EnumRuleType[EnumRuleType["WORD"] = 0] = "WORD";
    EnumRuleType[EnumRuleType["REGEXP"] = 1] = "REGEXP";
})(exports.EnumRuleType || (exports.EnumRuleType = {}));
var EnumRuleType = exports.EnumRuleType;
;
(function (EnumActionType) {
    EnumActionType[EnumActionType["STARTURL"] = 0] = "STARTURL";
    EnumActionType[EnumActionType["STARTCMDLINE"] = 1] = "STARTCMDLINE";
})(exports.EnumActionType || (exports.EnumActionType = {}));
var EnumActionType = exports.EnumActionType;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lmbWF0Y2guanMiLCIuLi9zcmMvbWF0Y2gvaWZtYXRjaC50cyJdLCJuYW1lcyI6WyJFbnVtUmVzcG9uc2VDb2RlIiwiZXhwb3J0cyIsIkNBVF9DQVRFR09SWSIsIkNBVF9GSUxMRVIiLCJDQVRfVE9PTCIsIkVudW1SdWxlVHlwZSIsIkVudW1BY3Rpb25UeXBlIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUNFQSxDQUFBLFVBQWtCQSxnQkFBbEIsRUFBa0M7QUFDaENBLHFCQUFBQSxpQkFBQSxTQUFBLElBQUEsQ0FBQSxJQUFBLFNBQUE7QUFDQUEscUJBQUFBLGlCQUFBLE1BQUEsSUFBQSxDQUFBLElBQUEsTUFBQTtBQUNBQSxxQkFBQUEsaUJBQUEsT0FBQSxJQUFBLENBQUEsSUFBQSxPQUFBO0FBQ0QsQ0FKRCxFQUFrQkMsUUFBQUQsZ0JBQUEsS0FBQUMsUUFBQUQsZ0JBQUEsR0FBZ0IsRUFBaEIsQ0FBbEI7QUFBQSxJQUFrQkEsbUJBQUFDLFFBQUFELGdCQUFsQjtBQU9hQyxRQUFBQyxZQUFBLEdBQWUsVUFBZjtBQUNBRCxRQUFBRSxVQUFBLEdBQWEsUUFBYjtBQUNBRixRQUFBRyxRQUFBLEdBQVcsTUFBWDtBQTBCWjtBQU9ELENBQUEsVUFBbUJDLFlBQW5CLEVBQStCO0FBQzdCQSxpQkFBQUEsYUFBQSxNQUFBLElBQUEsQ0FBQSxJQUFBLE1BQUE7QUFDQUEsaUJBQUFBLGFBQUEsUUFBQSxJQUFBLENBQUEsSUFBQSxRQUFBO0FBQ0QsQ0FIRCxFQUFtQkosUUFBQUksWUFBQSxLQUFBSixRQUFBSSxZQUFBLEdBQVksRUFBWixDQUFuQjtBQUFBLElBQW1CQSxlQUFBSixRQUFBSSxZQUFuQjtBQVFLO0FBMkhMLENBQUEsVUFBa0JDLGNBQWxCLEVBQWdDO0FBQzlCQSxtQkFBQUEsZUFBQSxVQUFBLElBQUEsQ0FBQSxJQUFBLFVBQUE7QUFDQUEsbUJBQUFBLGVBQUEsY0FBQSxJQUFBLENBQUEsSUFBQSxjQUFBO0FBQ0QsQ0FIRCxFQUFrQkwsUUFBQUssY0FBQSxLQUFBTCxRQUFBSyxjQUFBLEdBQWMsRUFBZCxDQUFsQjtBQUFBLElBQWtCQSxpQkFBQUwsUUFBQUssY0FBbEIiLCJmaWxlIjoibWF0Y2gvaWZtYXRjaC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuKGZ1bmN0aW9uIChFbnVtUmVzcG9uc2VDb2RlKSB7XG4gICAgRW51bVJlc3BvbnNlQ29kZVtFbnVtUmVzcG9uc2VDb2RlW1wiTk9NQVRDSFwiXSA9IDBdID0gXCJOT01BVENIXCI7XG4gICAgRW51bVJlc3BvbnNlQ29kZVtFbnVtUmVzcG9uc2VDb2RlW1wiRVhFQ1wiXSA9IDFdID0gXCJFWEVDXCI7XG4gICAgRW51bVJlc3BvbnNlQ29kZVtFbnVtUmVzcG9uc2VDb2RlW1wiUVVFUllcIl0gPSAyXSA9IFwiUVVFUllcIjtcbn0pKGV4cG9ydHMuRW51bVJlc3BvbnNlQ29kZSB8fCAoZXhwb3J0cy5FbnVtUmVzcG9uc2VDb2RlID0ge30pKTtcbnZhciBFbnVtUmVzcG9uc2VDb2RlID0gZXhwb3J0cy5FbnVtUmVzcG9uc2VDb2RlO1xuZXhwb3J0cy5DQVRfQ0FURUdPUlkgPSBcImNhdGVnb3J5XCI7XG5leHBvcnRzLkNBVF9GSUxMRVIgPSBcImZpbGxlclwiO1xuZXhwb3J0cy5DQVRfVE9PTCA9IFwidG9vbFwiO1xuO1xuKGZ1bmN0aW9uIChFbnVtUnVsZVR5cGUpIHtcbiAgICBFbnVtUnVsZVR5cGVbRW51bVJ1bGVUeXBlW1wiV09SRFwiXSA9IDBdID0gXCJXT1JEXCI7XG4gICAgRW51bVJ1bGVUeXBlW0VudW1SdWxlVHlwZVtcIlJFR0VYUFwiXSA9IDFdID0gXCJSRUdFWFBcIjtcbn0pKGV4cG9ydHMuRW51bVJ1bGVUeXBlIHx8IChleHBvcnRzLkVudW1SdWxlVHlwZSA9IHt9KSk7XG52YXIgRW51bVJ1bGVUeXBlID0gZXhwb3J0cy5FbnVtUnVsZVR5cGU7XG47XG4oZnVuY3Rpb24gKEVudW1BY3Rpb25UeXBlKSB7XG4gICAgRW51bUFjdGlvblR5cGVbRW51bUFjdGlvblR5cGVbXCJTVEFSVFVSTFwiXSA9IDBdID0gXCJTVEFSVFVSTFwiO1xuICAgIEVudW1BY3Rpb25UeXBlW0VudW1BY3Rpb25UeXBlW1wiU1RBUlRDTURMSU5FXCJdID0gMV0gPSBcIlNUQVJUQ01ETElORVwiO1xufSkoZXhwb3J0cy5FbnVtQWN0aW9uVHlwZSB8fCAoZXhwb3J0cy5FbnVtQWN0aW9uVHlwZSA9IHt9KSk7XG52YXIgRW51bUFjdGlvblR5cGUgPSBleHBvcnRzLkVudW1BY3Rpb25UeXBlO1xuIiwiXHJcblxyXG5leHBvcnQgY29uc3QgZW51bSBFbnVtUmVzcG9uc2VDb2RlIHtcclxuICBOT01BVENIID0gMCxcclxuICBFWEVDLFxyXG4gIFFVRVJZXHJcbn1cclxuXHJcblxyXG5leHBvcnQgY29uc3QgQ0FUX0NBVEVHT1JZID0gXCJjYXRlZ29yeVwiO1xyXG5leHBvcnQgY29uc3QgQ0FUX0ZJTExFUiA9IFwiZmlsbGVyXCI7XHJcbmV4cG9ydCBjb25zdCBDQVRfVE9PTCA9IFwidG9vbFwiO1xyXG5cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVByb21wdERlc2NyaXB0aW9uIHtcclxuICBkZXNjcmlwdGlvbjogc3RyaW5nLFxyXG4gIHR5cGU6IHN0cmluZyxcclxuICBwYXR0ZXJuOiBSZWdFeHAsXHJcbiAgbWVzc2FnZTogc3RyaW5nLFxyXG4gIGRlZmF1bHQ6IHN0cmluZyxcclxuICByZXF1aXJlZDogYm9vbGVhblxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBJUmVjb3JkID0geyBba2V5IDogc3RyaW5nXSA6IHN0cmluZ307XHJcblxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJV2hhdElzQW5zd2VyIHtcclxuICBzZW50ZW5jZTogSVNlbnRlbmNlLFxyXG4gIHJlY29yZCA6IElSZWNvcmQsXHJcbiAgY2F0ZWdvcnkgOiBzdHJpbmcsXHJcbiAgcmVzdWx0OiBzdHJpbmcsXHJcbiAgX3JhbmtpbmcgOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJTWF0Y2hlZFNldFJlY29yZCB7XHJcbiAgc2V0SWQgOiBzdHJpbmcsXHJcbiAgcmVjb3JkIDogSVJlY29yZFxyXG59O1xyXG5leHBvcnQgdHlwZSBJTWF0Y2hlZFNldFJlY29yZHMgPSBJTWF0Y2hlZFNldFJlY29yZFtdO1xyXG4vKipcclxuICogTWFwIGNhdGVnb3J5IC0+IHZhbHVlXHJcbiAqL1xyXG5leHBvcnQgdHlwZSBJTWF0Y2hTZXQgPSB7IFtrZXkgOiBzdHJpbmddIDogc3RyaW5nfTtcclxuXHJcbmV4cG9ydCBjb25zdCAgZW51bSBFbnVtUnVsZVR5cGUge1xyXG4gIFdPUkQsXHJcbiAgUkVHRVhQXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVRvb2xTZXQge1xyXG4gICAgICBzZXQ6IHN0cmluZ1tdLFxyXG4gICAgICByZXNwb25zZTogc3RyaW5nXHJcbiAgICB9O1xyXG5cclxuZXhwb3J0IHR5cGUgSVRvb2xTZXRzID0ge1xyXG4gICAgW2tleTogc3RyaW5nXTogSVRvb2xTZXRcclxuICAgIH07XHJcbi8qKlxyXG4gKiBAaW50ZXJmYWNlIElUb29sXHJcbiAqXHJcbiAqIHZhciBvVG9vbCA9IHsgJ25hbWUnIDogJ0ZMUEQnLFxyXG4gKiAgICdyZXF1aXJlcycgOiB7ICdzeXN0ZW1JZCcgOiB7fSwgJ2NsaWVudCcgOnt9fSxcclxuICogICAnb3B0aW9uYWwnIDogeyAnY2F0YWxvZycgOiB7fSwgJ2dyb3VwJyA6e319XHJcbiAqIH07XHJcbiovXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVRvb2wge1xyXG4gIG5hbWU6IHN0cmluZyxcclxuICByZXF1aXJlczogeyBba2V5OiBzdHJpbmddOiBPYmplY3QgfSxcclxuICBvcHRpb25hbD86IHsgW2tleTogc3RyaW5nXTogT2JqZWN0IH0sXHJcbiAgc2V0cz86IElUb29sU2V0c1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElUb29sTWF0Y2hSZXN1bHQge1xyXG4gIHJlcXVpcmVkOiB7IFtrZXk6IHN0cmluZ106IElXb3JkIH0sXHJcbiAgbWlzc2luZzogeyBba2V5OiBzdHJpbmddOiBudW1iZXIgfSxcclxuICBvcHRpb25hbD86IHsgW2tleTogc3RyaW5nXTogSVdvcmQgfSxcclxuICBzcHVyaW91czogeyBba2V5OiBzdHJpbmddOiBudW1iZXIgfSxcclxuICB0b29sbWVudGlvbmVkOiBJV29yZFtdXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVByb21wdCB7XHJcbiAgdGV4dDogc3RyaW5nLFxyXG4gIGNhdGVnb3J5OiBzdHJpbmdcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJVG9vbE1hdGNoIHtcclxuICB0b29sbWF0Y2hyZXN1bHQ6IElUb29sTWF0Y2hSZXN1bHQsXHJcbiAgc2VudGVuY2U6IElTZW50ZW5jZSxcclxuICB0b29sOiBJVG9vbCxcclxuICByYW5rOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJV29yZCB7XHJcbiAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgbWF0Y2hlZFN0cmluZzogc3RyaW5nLFxyXG4gIGNhdGVnb3J5Pzogc3RyaW5nLFxyXG4gIF9yYW5raW5nPzogbnVtYmVyLFxyXG4gIGxldmVubWF0Y2g/OiBudW1iZXIsXHJcbiAgcmVpbmZvcmNlPzogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIElTZW50ZW5jZSA9IEFycmF5PElXb3JkPjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVJ1bGUge1xyXG4gIHR5cGU6IEVudW1SdWxlVHlwZSxcclxuICBrZXk6IHN0cmluZyxcclxuICB3b3JkPzogc3RyaW5nLFxyXG4gIHJlZ2V4cD86IFJlZ0V4cCxcclxuICBhcmdzTWFwPzogeyBba2V5OiBudW1iZXJdOiBzdHJpbmcgfSAgLy8gYSBtYXAgb2YgcmVnZXhwIG1hdGNoIGdyb3VwIC0+IGNvbnRleHQga2V5XHJcbiAgLy8gZS5nLiAvKFthLXowLTldezMsM30pQ0xOVChbXFxkezMsM31dKS9cclxuICAvLyAgICAgIHsgMSA6IFwic3lzdGVtSWRcIiwgMiA6IFwiY2xpZW50XCIgfVxyXG4gIGZvbGxvd3M6IGNvbnRleHRcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJbnRlbnRSdWxlIHtcclxuICB0eXBlOiBFbnVtUnVsZVR5cGUsXHJcbiAgcmVnZXhwOiBSZWdFeHAsXHJcbiAgYXJnc01hcDogeyBba2V5OiBzdHJpbmddOiBudW1iZXIgfSAgLy8gYSBtYXAgb2YgcmVnZXhwIG1hdGNoIGdyb3VwIC0+IGNvbnRleHQga2V5XHJcbiAgLy8gZS5nLiAvKFthLXowLTldezMsM30pQ0xOVChbXFxkezMsM31dKS9cclxuICAvLyAgICAgIHsgMSA6IFwic3lzdGVtSWRcIiwgMiA6IFwiY2xpZW50XCIgfVxyXG4gIGZvbGxvd3M/OiBjb250ZXh0XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBIHJ1bGUgbWF0Y2hpbmcgYSBzaW5nbGUgc3RyaW5nXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIG1SdWxlIHtcclxuICB0eXBlOiBFbnVtUnVsZVR5cGUsXHJcbiAgd29yZD86IHN0cmluZyxcclxuICBsb3dlcmNhc2V3b3JkPyA6IHN0cmluZyxcclxuICByZWdleHA/OiBSZWdFeHAsXHJcbiAgbWF0Y2hlZFN0cmluZz86IHN0cmluZyxcclxuICBtYXRjaEluZGV4PzogbnVtYmVyLFxyXG4gIGNhdGVnb3J5OiBzdHJpbmcsXHJcbiAgLyoqXHJcbiAgICogb25seSB1c2UgYW4gZXhhY3QgbWF0Y2hcclxuICAgKi9cclxuICBleGFjdE9ubHk/IDogYm9vbGVhbixcclxuICBfcmFua2luZz86IG51bWJlclxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElDYXRlZ29yaXplZFN0cmluZyB7XHJcbiAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgbWF0Y2hlZFN0cmluZzogc3RyaW5nLFxyXG4gIGNhdGVnb3J5OiBzdHJpbmcsXHJcbiAgYnJlYWtkb3duPzogQXJyYXk8YW55PlxyXG4gIHNjb3JlPzogbnVtYmVyLFxyXG4gIF9yYW5raW5nPzogbnVtYmVyLFxyXG4gIGxldmVubWF0Y2g/OiBudW1iZXIgIC8vIGEgZGlzdGFuY2UgcmFua2luZ1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBjb250ZXh0ID0geyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfTtcclxuXHJcbi8qKlxyXG4gKiBEZWZpbmVzIHRoZSBpbnRlcmZhY2UgZm9yIGFuIGFuYWx5c2lzXHJcbiAqIHJlcG9uc2VcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVJlc3BvbnNlIHtcclxuICByYXRpbmc6IG51bWJlcixcclxuICB0eXBlOiBFbnVtUmVzcG9uc2VDb2RlLFxyXG4gIHF1ZXJ5OiBzdHJpbmcsXHJcbiAgY29udGV4dDogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSxcclxuICB0ZXh0OiBzdHJpbmcsXHJcbiAgYWN0aW9uOiBJQWN0aW9uLFxyXG4gIHByb21wdHM6IHtcclxuICAgIFtrZXk6IHN0cmluZ106IHtcclxuICAgICAgdGV4dDogc3RyaW5nLFxyXG4gICAgICAvKipcclxuICAgICAgICogRm9sbG93cyB0aGUgZmVhdHVyZXMgb2YgTlBNIHByb21wdHNcclxuICAgICAgICovXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBJUHJvbXB0RGVzY3JpcHRpb25cclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgY29uc3QgZW51bSBFbnVtQWN0aW9uVHlwZSB7XHJcbiAgU1RBUlRVUkwsXHJcbiAgU1RBUlRDTURMSU5FXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUFjdGlvbiB7XHJcbiAgZGF0YTogYW55LFxyXG4gIHR5cGU6IEVudW1BY3Rpb25UeXBlLFxyXG4gIHBhdHRlcm46IHN0cmluZyxcclxuICBjb25jcmV0ZTogc3RyaW5nXHJcbn1cclxuXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElNb2RlbHMge1xyXG4gICAgZG9tYWluczogc3RyaW5nW10sXHJcbiAgICB0b29sczogSVRvb2xbXSxcclxuICAgIGNhdGVnb3J5OiBzdHJpbmdbXSxcclxuICAgIG1SdWxlczogbVJ1bGVbXSxcclxuICAgIHJlY29yZHM6IGFueVtdXHJcbiAgICBzZWVuUnVsZXM/OiB7IFtrZXk6IHN0cmluZ106IG1SdWxlIH0sXHJcbiAgICBtZXRhIDoge1xyXG4gICAgICAgIC8vIGVudGl0eSAtPiByZWxhdGlvbiAtPiB0YXJnZXRcclxuICAgICAgICB0MyA6IHsgW2tleTogc3RyaW5nXSA6IHsgW2tleSA6IHN0cmluZ10gOiBhbnkgfX1cclxuICAgIH1cclxufVxyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
