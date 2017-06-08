"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var fdevsta_monmove_1 = require("fdevsta_monmove");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lmbWF0Y2guanMiLCIuLi9zcmMvbWF0Y2gvaWZtYXRjaC50cyJdLCJuYW1lcyI6WyJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImV4cG9ydHMiLCJ2YWx1ZSIsImZkZXZzdGFfbW9ubW92ZV8xIiwicmVxdWlyZSIsIkVudW1SZXNwb25zZUNvZGUiLCJDQVRfQ0FURUdPUlkiLCJDQVRfRklMTEVSIiwiQ0FUX1RPT0wiLCJFUlJfTk9fS05PV05fV09SRCIsIkVSUl9FTVBUWV9JTlBVVCIsImFPcGVyYXRvck5hbWVzIiwiRW51bUFjdGlvblR5cGUiLCJFbnVtUnVsZVR5cGUiLCJJRk1vZGVsIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQUEsT0FBT0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkMsRUFBRUMsT0FBTyxJQUFULEVBQTdDO0FDQ0EsSUFBQUMsb0JBQUFDLFFBQUEsaUJBQUEsQ0FBQTtBQUVBLElBQWtCQyxnQkFBbEI7QUFBQSxDQUFBLFVBQWtCQSxnQkFBbEIsRUFBa0M7QUFDaENBLHFCQUFBQSxpQkFBQSxTQUFBLElBQUEsQ0FBQSxJQUFBLFNBQUE7QUFDQUEscUJBQUFBLGlCQUFBLE1BQUEsSUFBQSxDQUFBLElBQUEsTUFBQTtBQUNBQSxxQkFBQUEsaUJBQUEsT0FBQSxJQUFBLENBQUEsSUFBQSxPQUFBO0FBQ0QsQ0FKRCxFQUFrQkEsbUJBQUFKLFFBQUFJLGdCQUFBLEtBQUFKLFFBQUFJLGdCQUFBLEdBQWdCLEVBQWhCLENBQWxCO0FBT2FKLFFBQUFLLFlBQUEsR0FBZSxVQUFmO0FBQ0FMLFFBQUFNLFVBQUEsR0FBYSxRQUFiO0FBQ0FOLFFBQUFPLFFBQUEsR0FBVyxNQUFYO0FBR0FQLFFBQUFRLGlCQUFBLEdBQW9CLGVBQXBCO0FBQ0FSLFFBQUFTLGVBQUEsR0FBa0IsYUFBbEI7QUFLWjtBQVFBO0FBYVlULFFBQUFVLGNBQUEsR0FBaUIsQ0FBQyxlQUFELEVBQWtCLGFBQWxCLEVBQWlDLFlBQWpDLEVBQStDLFdBQS9DLEVBQTRELFFBQTVELEVBQXNFLE9BQXRFLENBQWpCO0FBZ0RaO0FBb0JJO0FBMkVKO0FBSWdCO0FBcUVoQjtBQWFBO0FBNEJELElBQWtCQyxjQUFsQjtBQUFBLENBQUEsVUFBa0JBLGNBQWxCLEVBQWdDO0FBQzlCQSxtQkFBQUEsZUFBQSxVQUFBLElBQUEsQ0FBQSxJQUFBLFVBQUE7QUFDQUEsbUJBQUFBLGVBQUEsY0FBQSxJQUFBLENBQUEsSUFBQSxjQUFBO0FBQ0QsQ0FIRCxFQUFrQkEsaUJBQUFYLFFBQUFXLGNBQUEsS0FBQVgsUUFBQVcsY0FBQSxHQUFjLEVBQWQsQ0FBbEI7QUF1Q0M7QUFFWVgsUUFBQVksWUFBQSxHQUFlVixrQkFBQVcsT0FBQSxDQUFRRCxZQUF2QjtBQUdiO0FBQ0EiLCJmaWxlIjoibWF0Y2gvaWZtYXRjaC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIGZkZXZzdGFfbW9ubW92ZV8xID0gcmVxdWlyZShcImZkZXZzdGFfbW9ubW92ZVwiKTtcbnZhciBFbnVtUmVzcG9uc2VDb2RlO1xuKGZ1bmN0aW9uIChFbnVtUmVzcG9uc2VDb2RlKSB7XG4gICAgRW51bVJlc3BvbnNlQ29kZVtFbnVtUmVzcG9uc2VDb2RlW1wiTk9NQVRDSFwiXSA9IDBdID0gXCJOT01BVENIXCI7XG4gICAgRW51bVJlc3BvbnNlQ29kZVtFbnVtUmVzcG9uc2VDb2RlW1wiRVhFQ1wiXSA9IDFdID0gXCJFWEVDXCI7XG4gICAgRW51bVJlc3BvbnNlQ29kZVtFbnVtUmVzcG9uc2VDb2RlW1wiUVVFUllcIl0gPSAyXSA9IFwiUVVFUllcIjtcbn0pKEVudW1SZXNwb25zZUNvZGUgPSBleHBvcnRzLkVudW1SZXNwb25zZUNvZGUgfHwgKGV4cG9ydHMuRW51bVJlc3BvbnNlQ29kZSA9IHt9KSk7XG5leHBvcnRzLkNBVF9DQVRFR09SWSA9IFwiY2F0ZWdvcnlcIjtcbmV4cG9ydHMuQ0FUX0ZJTExFUiA9IFwiZmlsbGVyXCI7XG5leHBvcnRzLkNBVF9UT09MID0gXCJ0b29sXCI7XG5leHBvcnRzLkVSUl9OT19LTk9XTl9XT1JEID0gXCJOT19LTk9XTl9XT1JEXCI7XG5leHBvcnRzLkVSUl9FTVBUWV9JTlBVVCA9IFwiRU1QVFlfSU5QVVRcIjtcbjtcbjtcbmV4cG9ydHMuYU9wZXJhdG9yTmFtZXMgPSBbXCJzdGFydGluZyB3aXRoXCIsIFwiZW5kaW5nIHdpdGhcIiwgXCJjb250YWluaW5nXCIsIFwiZXhjbHVkaW5nXCIsIFwiaGF2aW5nXCIsIFwiYmVpbmdcIl07XG47XG47XG47XG47XG47XG47XG52YXIgRW51bUFjdGlvblR5cGU7XG4oZnVuY3Rpb24gKEVudW1BY3Rpb25UeXBlKSB7XG4gICAgRW51bUFjdGlvblR5cGVbRW51bUFjdGlvblR5cGVbXCJTVEFSVFVSTFwiXSA9IDBdID0gXCJTVEFSVFVSTFwiO1xuICAgIEVudW1BY3Rpb25UeXBlW0VudW1BY3Rpb25UeXBlW1wiU1RBUlRDTURMSU5FXCJdID0gMV0gPSBcIlNUQVJUQ01ETElORVwiO1xufSkoRW51bUFjdGlvblR5cGUgPSBleHBvcnRzLkVudW1BY3Rpb25UeXBlIHx8IChleHBvcnRzLkVudW1BY3Rpb25UeXBlID0ge30pKTtcbjtcbmV4cG9ydHMuRW51bVJ1bGVUeXBlID0gZmRldnN0YV9tb25tb3ZlXzEuSUZNb2RlbC5FbnVtUnVsZVR5cGU7XG4vL2V4cG9ydCB7IElGTW9kZWwuSU1vZGVscyBhcyBJTW9kZWxzIH0gZnJvbSAnZmRldnN0YV9tb25tb3ZlJztcbi8qXG5cclxuZXhwb3J0IGludGVyZmFjZSBJTW9kZWxzIHtcbiAgICBmdWxsIDoge1xuICAgICAgZG9tYWluIDogeyBba2V5IDogc3RyaW5nXSA6IHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogc3RyaW5nLFxuICAgICAgICAgIGJpdGluZGV4IDogbnVtYmVyLFxuICAgICAgICAgIGNhdGVnb3JpZXMgOiB7IFtrZXkgOiBzdHJpbmddIDogSUNhdGVnb3J5RGVzYyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHJhd01vZGVscyA6IHsgW2tleSA6IHN0cmluZ10gOiBJTW9kZWx9O1xuICAgIGRvbWFpbnM6IHN0cmluZ1tdLFxuICAgIHRvb2xzOiBJVG9vbFtdLFxuICAgIGNhdGVnb3J5OiBzdHJpbmdbXSxcbiAgICBvcGVyYXRvcnMgOiB7IFtrZXk6IHN0cmluZ10gOiBJT3BlcmF0b3IgfSxcbiAgICBtUnVsZXM6IG1SdWxlW10sXG4gICAgcnVsZXMgOiBTcGxpdFJ1bGVzLFxuICAgIHJlY29yZHM6IGFueVtdXG4gICAgc2VlblJ1bGVzPzogeyBba2V5OiBzdHJpbmddOiBtUnVsZVtdIH0sXG4gICAgbWV0YSA6IHtcbiAgICAgICAgLy8gZW50aXR5IC0+IHJlbGF0aW9uIC0+IHRhcmdldFxuICAgICAgICB0MyA6IHsgW2tleTogc3RyaW5nXSA6IHsgW2tleSA6IHN0cmluZ10gOiBhbnkgfX1cbiAgICB9XG59XG4qLyBcbiIsIlxuXG5pbXBvcnQgeyBJRk1vZGVsIH0gZnJvbSAnZmRldnN0YV9tb25tb3ZlJztcblxuZXhwb3J0IGNvbnN0IGVudW0gRW51bVJlc3BvbnNlQ29kZSB7XG4gIE5PTUFUQ0ggPSAwLFxuICBFWEVDLFxuICBRVUVSWVxufVxuXG5cbmV4cG9ydCBjb25zdCBDQVRfQ0FURUdPUlkgPSBcImNhdGVnb3J5XCI7XG5leHBvcnQgY29uc3QgQ0FUX0ZJTExFUiA9IFwiZmlsbGVyXCI7XG5leHBvcnQgY29uc3QgQ0FUX1RPT0wgPSBcInRvb2xcIjtcblxuXG5leHBvcnQgY29uc3QgRVJSX05PX0tOT1dOX1dPUkQgPSBcIk5PX0tOT1dOX1dPUkRcIjtcbmV4cG9ydCBjb25zdCBFUlJfRU1QVFlfSU5QVVQgPSBcIkVNUFRZX0lOUFVUXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSUVSRXJyb3Ige1xuICBlcnJfY29kZSA6IHN0cmluZyxcbiAgdGV4dCA6IHN0cmluZ1xufTtcblxuZXhwb3J0IGludGVyZmFjZSBJRVJFcnJvck5PX0tOT1dOX1dPUkQgZXh0ZW5kcyBJRVJFcnJvcntcbiAgY29udGV4dCA6IHtcbiAgICB0b2tlbiA6IHN0cmluZyxcbiAgICBpbmRleDogbnVtYmVyLFxuICAgIHRva2VucyA6IHN0cmluZ1tdXG4gIH1cbn07XG5cblxuXG5leHBvcnQgaW50ZXJmYWNlIElQcm9tcHREZXNjcmlwdGlvbiB7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmcsXG4gIHR5cGU6IHN0cmluZyxcbiAgcGF0dGVybjogUmVnRXhwLFxuICBtZXNzYWdlOiBzdHJpbmcsXG4gIGRlZmF1bHQ6IHN0cmluZyxcbiAgcmVxdWlyZWQ6IGJvb2xlYW5cbn1cblxuZXhwb3J0IGNvbnN0IGFPcGVyYXRvck5hbWVzID0gW1wic3RhcnRpbmcgd2l0aFwiLCBcImVuZGluZyB3aXRoXCIsIFwiY29udGFpbmluZ1wiLCBcImV4Y2x1ZGluZ1wiLCBcImhhdmluZ1wiLCBcImJlaW5nXCJdO1xuZXhwb3J0IHR5cGUgT3BlcmF0b3JOYW1lID0gXCJzdGFydGluZyB3aXRoXCIgfCBcImVuZGluZyB3aXRoXCIgfCBcImNvbnRhaW5pbmdcIiB8IFwiYmVpbmdcIiB8IFwiZXhjbHVkaW5nXCIgfCBcImhhdmluZ1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIElPcGVyYXRvciB7XG4gIG9wZXJhdG9yIDogT3BlcmF0b3JOYW1lLFxuICBjb2RlIDogc3RyaW5nLFxuICBhcml0eSA6IG51bWJlcixcbiAgYXJnY2F0ZWdvcnkgOiBbIHN0cmluZ1tdIF1cbn1cblxuZXhwb3J0IHR5cGUgSVJlY29yZCA9IHsgW2tleSA6IHN0cmluZ10gOiBzdHJpbmdcbn07XG5cblxuZXhwb3J0IGludGVyZmFjZSBJV2hhdElzQW5zd2VyIHtcbiAgc2VudGVuY2U6IElTZW50ZW5jZSxcbiAgcmVjb3JkIDogSVJlY29yZCxcbiAgY2F0ZWdvcnkgOiBzdHJpbmcsXG4gIHJlc3VsdDogc3RyaW5nLFxuICBfcmFua2luZyA6IG51bWJlclxufVxuXG5cbmV4cG9ydCBpbnRlcmZhY2UgSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMgZXh0ZW5kcyBJUHJvY2Vzc2VkIHtcbiAgc2VudGVuY2VzPyA6IElTZW50ZW5jZVtdLFxuICBhbnN3ZXJzIDogSVdoYXRJc0Fuc3dlcltdXG59XG5cblxuXG5leHBvcnQgaW50ZXJmYWNlIElQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMgZXh0ZW5kcyBJUHJvY2Vzc2VkIHtcbiAgc2VudGVuY2VzPyA6IElTZW50ZW5jZVtdLFxuICB0dXBlbGFuc3dlcnMgOiBBcnJheTxJV2hhdElzVHVwZWxBbnN3ZXI+XG59XG5cblxuZXhwb3J0IGludGVyZmFjZSBJV2hhdElzVHVwZWxBbnN3ZXIge1xuICBzZW50ZW5jZTogSVNlbnRlbmNlLFxuICByZWNvcmQgOiBJUmVjb3JkLFxuICBjYXRlZ29yaWVzIDogc3RyaW5nW10sXG4gIHJlc3VsdDogc3RyaW5nW10sXG4gIF9yYW5raW5nIDogbnVtYmVyXG59XG5cblxuZXhwb3J0IGludGVyZmFjZSBJTWF0Y2hlZFNldFJlY29yZCB7XG4gIHNldElkIDogc3RyaW5nLFxuICByZWNvcmQgOiBJUmVjb3JkXG59O1xuZXhwb3J0IHR5cGUgSU1hdGNoZWRTZXRSZWNvcmRzID0gSU1hdGNoZWRTZXRSZWNvcmRbXTtcbi8qKlxuICogTWFwIGNhdGVnb3J5IC0+IHZhbHVlXG4gKi9cbmV4cG9ydCB0eXBlIElNYXRjaFNldCA9IHsgW2tleSA6IHN0cmluZ10gOiBzdHJpbmd9O1xuXG5leHBvcnQgdHlwZSBFbnVtUnVsZVR5cGUgPSBJRk1vZGVsLkVudW1SdWxlVHlwZTtcblxuLy9leHBvcnQgY29uc3QgZW51bSBFbnVtUnVsZVR5cGUgPSBJRk1vZGVsLkVudW1SdWxlVHlwZTtcbi8qXG5leHBvcnQgY29uc3QgIGVudW0gRW51bVJ1bGVUeXBlIHtcbiAgV09SRCxcbiAgUkVHRVhQXG59XG4qL1xuXG5leHBvcnQgaW50ZXJmYWNlIElUb29sU2V0IHtcbiAgICAgIHNldDogc3RyaW5nW10sXG4gICAgICByZXNwb25zZTogc3RyaW5nXG4gICAgfTtcblxuZXhwb3J0IHR5cGUgSVRvb2xTZXRzID0ge1xuICAgIFtrZXk6IHN0cmluZ106IElUb29sU2V0XG4gICAgfTtcbi8qKlxuICogQGludGVyZmFjZSBJVG9vbFxuICpcbiAqIHZhciBvVG9vbCA9IHsgJ25hbWUnIDogJ0ZMUEQnLFxuICogICAncmVxdWlyZXMnIDogeyAnc3lzdGVtSWQnIDoge30sICdjbGllbnQnIDp7fX0sXG4gKiAgICdvcHRpb25hbCcgOiB7ICdjYXRhbG9nJyA6IHt9LCAnZ3JvdXAnIDp7fX1cbiAqIH07XG4qL1xuZXhwb3J0IGludGVyZmFjZSBJVG9vbCB7XG4gIG5hbWU6IHN0cmluZyxcbiAgcmVxdWlyZXM6IHsgW2tleTogc3RyaW5nXTogT2JqZWN0IH0sXG4gIG9wdGlvbmFsPzogeyBba2V5OiBzdHJpbmddOiBPYmplY3QgfSxcbiAgc2V0cz86IElUb29sU2V0c1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIElUb29sTWF0Y2hSZXN1bHQge1xuICByZXF1aXJlZDogeyBba2V5OiBzdHJpbmddOiBJV29yZCB9LFxuICBtaXNzaW5nOiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9LFxuICBvcHRpb25hbD86IHsgW2tleTogc3RyaW5nXTogSVdvcmQgfSxcbiAgc3B1cmlvdXM6IHsgW2tleTogc3RyaW5nXTogbnVtYmVyIH0sXG4gIHRvb2xtZW50aW9uZWQ6IElXb3JkW11cbn1cblxuZXhwb3J0IGludGVyZmFjZSBJUHJvbXB0IHtcbiAgdGV4dDogc3RyaW5nLFxuICBjYXRlZ29yeTogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSVRvb2xNYXRjaCB7XG4gIHRvb2xtYXRjaHJlc3VsdDogSVRvb2xNYXRjaFJlc3VsdCxcbiAgc2VudGVuY2U6IElTZW50ZW5jZSxcbiAgdG9vbDogSVRvb2wsXG4gIHJhbms6IG51bWJlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIElXb3JkIHtcbiAgc3RyaW5nOiBzdHJpbmcsXG4gIG1hdGNoZWRTdHJpbmc6IHN0cmluZyxcbiAgY2F0ZWdvcnk6IHN0cmluZyxcbiAgX3Jhbmtpbmc/OiBudW1iZXIsXG4gIGxldmVubWF0Y2g/OiBudW1iZXIsXG4gIHJlaW5mb3JjZT86IG51bWJlcixcbiAgYml0aW5kZXg/IDogbnVtYmVyLFxuICBydWxlPyA6IG1SdWxlXG59XG5cbmV4cG9ydCB0eXBlIElTZW50ZW5jZSA9IEFycmF5PElXb3JkPjtcblxuZXhwb3J0IGludGVyZmFjZSBJUnVsZSB7XG4gIHR5cGU6IEVudW1SdWxlVHlwZSxcbiAga2V5OiBzdHJpbmcsXG4gIHdvcmQ/OiBzdHJpbmcsXG4gIHJlZ2V4cD86IFJlZ0V4cCxcbiAgYXJnc01hcD86IHsgW2tleTogbnVtYmVyXTogc3RyaW5nIH0gIC8vIGEgbWFwIG9mIHJlZ2V4cCBtYXRjaCBncm91cCAtPiBjb250ZXh0IGtleVxuICAvLyBlLmcuIC8oW2EtejAtOV17MywzfSlDTE5UKFtcXGR7MywzfV0pL1xuICAvLyAgICAgIHsgMSA6IFwic3lzdGVtSWRcIiwgMiA6IFwiY2xpZW50XCIgfVxuICBmb2xsb3dzOiBjb250ZXh0XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW50ZW50UnVsZSB7XG4gIHR5cGU6IEVudW1SdWxlVHlwZSxcbiAgcmVnZXhwOiBSZWdFeHAsXG4gIGFyZ3NNYXA6IHsgW2tleTogc3RyaW5nXTogbnVtYmVyIH0gIC8vIGEgbWFwIG9mIHJlZ2V4cCBtYXRjaCBncm91cCAtPiBjb250ZXh0IGtleVxuICAvLyBlLmcuIC8oW2EtejAtOV17MywzfSlDTE5UKFtcXGR7MywzfV0pL1xuICAvLyAgICAgIHsgMSA6IFwic3lzdGVtSWRcIiwgMiA6IFwiY2xpZW50XCIgfVxuICBmb2xsb3dzPzogY29udGV4dFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIElSYW5nZSB7XG4gIGxvdzogbnVtYmVyLCBoaWdoOiBudW1iZXIsXG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIElXb3JkUmFuZ2UgZXh0ZW5kcyBJUmFuZ2VcbntcbiAgcnVsZT8gOiBtUnVsZSB9O1xuLyoqXG4gKiBBIHJ1bGUgbWF0Y2hpbmcgYSBzaW5nbGUgc3RyaW5nXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgbVJ1bGUge1xuICB0eXBlOiBFbnVtUnVsZVR5cGUsXG4gIHdvcmQ/OiBzdHJpbmcsXG4gIGxvd2VyY2FzZXdvcmQ/IDogc3RyaW5nLFxuICByZWdleHA/OiBSZWdFeHAsXG4gIG1hdGNoZWRTdHJpbmc/OiBzdHJpbmcsXG4gIG1hdGNoSW5kZXg/OiBudW1iZXIsXG4gIGNhdGVnb3J5OiBzdHJpbmcsXG4gIGJpdGluZGV4IDogbnVtYmVyLFxuICByYW5nZT8gOiAgSVdvcmRSYW5nZSxcbiAgLyoqXG4gICAqIG9ubHkgdXNlIGFuIGV4YWN0IG1hdGNoXG4gICAqL1xuICBleGFjdE9ubHk/IDogYm9vbGVhbixcbiAgX3Jhbmtpbmc/OiBudW1iZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJV29yZFJ1bGVzIHtcbiAgcnVsZXMgOiBBcnJheTxtUnVsZT4sXG4gIGJpdGluZGV4OiBudW1iZXJcbn1cbmV4cG9ydCB0eXBlIFNwbGl0UnVsZXMgPSBJRk1vZGVsLlNwbGl0UnVsZXM7XG4vKlxuZXhwb3J0IGludGVyZmFjZSBTcGxpdFJ1bGVzIHtcbiAgYWxsUnVsZXM6IEFycmF5PG1SdWxlPixcbiAgbm9uV29yZFJ1bGVzIDogQXJyYXk8bVJ1bGU+LFxuICB3b3JkTWFwOiB7IFtrZXkgOiBzdHJpbmddIDogSVdvcmRSdWxlcyB9LFxuICB3b3JkQ2FjaGUgOiAgeyBba2V5OiBzdHJpbmddOiBBcnJheTxJQ2F0ZWdvcml6ZWRTdHJpbmc+IH1cbn07XG4qL1xuXG5leHBvcnQgaW50ZXJmYWNlIElDYXRlZ29yaXplZFN0cmluZyB7XG4gIHN0cmluZzogc3RyaW5nLFxuICBtYXRjaGVkU3RyaW5nOiBzdHJpbmcsXG4gIGNhdGVnb3J5OiBzdHJpbmcsXG4gIGJyZWFrZG93bj86IEFycmF5PGFueT5cbiAgc2NvcmU/OiBudW1iZXIsXG4gIF9yYW5raW5nPzogbnVtYmVyLFxuICBsZXZlbm1hdGNoPzogbnVtYmVyICAvLyBhIGRpc3RhbmNlIHJhbmtpbmdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJQ2F0ZWdvcml6ZWRTdHJpbmdSYW5nZWQgZXh0ZW5kcyBJQ2F0ZWdvcml6ZWRTdHJpbmd7XG4gIHN0cmluZzogc3RyaW5nLFxuICBtYXRjaGVkU3RyaW5nOiBzdHJpbmcsXG4gIGNhdGVnb3J5OiBzdHJpbmcsXG4gIGJyZWFrZG93bj86IEFycmF5PGFueT5cbiAgLyoqXG4gICAqIExlbmd0aCBvZiB0aGUgZW50cnkgKGZvciBza2lwcGluZyBmb2xsb3dpbmcgd29yZHMpXG4gICAqL1xuICBzY29yZT86IG51bWJlcixcbiAgc3Bhbj8gOiBudW1iZXIsXG4gIHJ1bGUgOiBtUnVsZSxcbiAgX3Jhbmtpbmc/OiBudW1iZXIsXG4gIGxldmVubWF0Y2g/OiBudW1iZXIgIC8vIGEgZGlzdGFuY2UgcmFua2luZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIElQcm9jZXNzZWQge1xuICB0b2tlbnMgOiBzdHJpbmdbXSxcbiAgZXJyb3JzPyA6IElFUkVycm9yW11cbn1cblxuZXhwb3J0IGludGVyZmFjZSBJUHJvY2Vzc2VkU2VudGVuY2VzIGV4dGVuZHMgSVByb2Nlc3NlZCB7XG4gIHRva2VucyA6IHN0cmluZ1tdLFxuICBlcnJvcnM/IDogYW55LFxuICBzZW50ZW5jZXMgOiBJU2VudGVuY2VbXVxufTtcblxuZXhwb3J0IHR5cGUgSUNhdGVnb3J5RmlsdGVyID0geyBba2V5OiBzdHJpbmddOiBib29sZWFuIH07XG5cblxuZXhwb3J0IHR5cGUgSURvbWFpbkNhdGVnb3J5RmlsdGVyID0ge1xuICBkb21haW5zIDogc3RyaW5nW10sXG4gIGNhdGVnb3J5U2V0IDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH1cbn1cblxuXG5leHBvcnQgaW50ZXJmYWNlIElQcm9jZXNzZWRFeHRyYWN0ZWRDYXRlZ29yaWVzIGV4dGVuZHMgSVByb2Nlc3NlZCB7XG4gIGNhdGVnb3JpZXMgOiBzdHJpbmdbXSxcbn07XG5cblxuXG5leHBvcnQgdHlwZSBjb250ZXh0ID0geyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfTtcblxuLyoqXG4gKiBEZWZpbmVzIHRoZSBpbnRlcmZhY2UgZm9yIGFuIGFuYWx5c2lzXG4gKiByZXBvbnNlXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSVJlc3BvbnNlIHtcbiAgcmF0aW5nOiBudW1iZXIsXG4gIHR5cGU6IEVudW1SZXNwb25zZUNvZGUsXG4gIHF1ZXJ5OiBzdHJpbmcsXG4gIGNvbnRleHQ6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH0sXG4gIHRleHQ6IHN0cmluZyxcbiAgYWN0aW9uOiBJQWN0aW9uLFxuICBwcm9tcHRzOiB7XG4gICAgW2tleTogc3RyaW5nXToge1xuICAgICAgdGV4dDogc3RyaW5nLFxuICAgICAgLyoqXG4gICAgICAgKiBGb2xsb3dzIHRoZSBmZWF0dXJlcyBvZiBOUE0gcHJvbXB0c1xuICAgICAgICovXG4gICAgICBkZXNjcmlwdGlvbjogSVByb21wdERlc2NyaXB0aW9uXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgZW51bSBFbnVtQWN0aW9uVHlwZSB7XG4gIFNUQVJUVVJMLFxuICBTVEFSVENNRExJTkVcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJQWN0aW9uIHtcbiAgZGF0YTogYW55LFxuICB0eXBlOiBFbnVtQWN0aW9uVHlwZSxcbiAgcGF0dGVybjogc3RyaW5nLFxuICBjb25jcmV0ZTogc3RyaW5nXG59XG5cblxuZXhwb3J0IGludGVyZmFjZSBJQ2F0ZWdvcnlEZXNjIHtcbiAgbmFtZTogc3RyaW5nLFxuICBpbXBvcnRhbmNlPyA6IG51bWJlcixcbiAgZGVzY3JpcHRpb24/IDogc3RyaW5nLFxuICBpc2tleT8gOiBib29sZWFuXG4gIGV4YWN0TWF0Y2g6IGJvb2xlYW4sXG4gIHN5bm9ueW1zPyA6IHN0cmluZ1tdO1xufVxuXG5cblxuZXhwb3J0IGludGVyZmFjZSBJTW9kZWwge1xuICAgIGRvbWFpbjogc3RyaW5nLFxuICAgIGJpdGluZGV4IDogbnVtYmVyLFxuICAgIGRlc2NyaXB0aW9uPyA6IHN0cmluZyxcbiAgICB0b29sOiBJVG9vbCxcbiAgICB0b29saGlkZGVuPzogYm9vbGVhbixcbiAgICBzeW5vbnltcz86IHsgW2tleTogc3RyaW5nXTogc3RyaW5nW10gfSxcbiAgICBjYXRlZ29yeURlc2NyaWJlZCA6ICB7IG5hbWUgOiBzdHJpbmcsXG4gICAgICAgIGRlc2NyaXB0aW9uPyA6IHN0cmluZyxcbiAgICAgICAga2V5PyA6IHN0cmluZyB9W10sXG4gICAgY2F0ZWdvcnk6IHN0cmluZ1tdLFxuICAgIGNvbHVtbnM/IDogc3RyaW5nW10sXG4gICAgd29yZGluZGV4OiBzdHJpbmdbXSxcbiAgICBleGFjdG1hdGNoPyA6IHN0cmluZ1tdLFxuICAgIGhpZGRlbjogc3RyaW5nW11cbn07XG5cbmV4cG9ydCBjb25zdCBFbnVtUnVsZVR5cGUgPSBJRk1vZGVsLkVudW1SdWxlVHlwZTtcbmV4cG9ydCB0eXBlIElNb2RlbHMgPSBJRk1vZGVsLklNb2RlbHM7XG5cbi8vZXhwb3J0IHsgSUZNb2RlbC5JTW9kZWxzIGFzIElNb2RlbHMgfSBmcm9tICdmZGV2c3RhX21vbm1vdmUnO1xuLypcblxuZXhwb3J0IGludGVyZmFjZSBJTW9kZWxzIHtcbiAgICBmdWxsIDoge1xuICAgICAgZG9tYWluIDogeyBba2V5IDogc3RyaW5nXSA6IHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogc3RyaW5nLFxuICAgICAgICAgIGJpdGluZGV4IDogbnVtYmVyLFxuICAgICAgICAgIGNhdGVnb3JpZXMgOiB7IFtrZXkgOiBzdHJpbmddIDogSUNhdGVnb3J5RGVzYyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHJhd01vZGVscyA6IHsgW2tleSA6IHN0cmluZ10gOiBJTW9kZWx9O1xuICAgIGRvbWFpbnM6IHN0cmluZ1tdLFxuICAgIHRvb2xzOiBJVG9vbFtdLFxuICAgIGNhdGVnb3J5OiBzdHJpbmdbXSxcbiAgICBvcGVyYXRvcnMgOiB7IFtrZXk6IHN0cmluZ10gOiBJT3BlcmF0b3IgfSxcbiAgICBtUnVsZXM6IG1SdWxlW10sXG4gICAgcnVsZXMgOiBTcGxpdFJ1bGVzLFxuICAgIHJlY29yZHM6IGFueVtdXG4gICAgc2VlblJ1bGVzPzogeyBba2V5OiBzdHJpbmddOiBtUnVsZVtdIH0sXG4gICAgbWV0YSA6IHtcbiAgICAgICAgLy8gZW50aXR5IC0+IHJlbGF0aW9uIC0+IHRhcmdldFxuICAgICAgICB0MyA6IHsgW2tleTogc3RyaW5nXSA6IHsgW2tleSA6IHN0cmluZ10gOiBhbnkgfX1cbiAgICB9XG59XG4qLyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
