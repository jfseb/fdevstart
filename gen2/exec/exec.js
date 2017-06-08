"use strict";
/**
 * Functionality to execute a certain response
 *
 * via a) commandline (e.g. browser startup)
 * @file
 */

Object.defineProperty(exports, "__esModule", { value: true });
var debug = require("debug");
var IFMatch = require("../match/ifmatch");
var debuglog = debug('dispatcher');
var child_process_1 = require("child_process");
var Match = require("../match/match");
var EnumResponseCode;
(function (EnumResponseCode) {
    EnumResponseCode[EnumResponseCode["NOMATCH"] = 0] = "NOMATCH";
    EnumResponseCode[EnumResponseCode["EXEC"] = 1] = "EXEC";
    EnumResponseCode[EnumResponseCode["QUERY"] = 2] = "QUERY";
})(EnumResponseCode = exports.EnumResponseCode || (exports.EnumResponseCode = {}));
/**
 * Defines the interface for an analysis
 * reponse
 */
/*
export interface IResponse {
  rating : number,
  type : EnumResponseCode,
  query : string,
  context : { [key:string] :string},
  text : string,
  action : IAction,
  prompts : { [key :string ] : { text : string, description : any }; }


export const enum EnumActionType {
  STARTURL,
  STARTCMDLINE
}

export interface IAction {
  data : any,
  type : EnumActionType,
  pattern : string,
  concrete : string
}
}*/
//var exec = require('child_process').exec
function startBrowser(oUrlAction) {
    var cmd = '"%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --incognito -url "' + oUrlAction.concrete + '"';
    child_process_1.exec(cmd, function (error, stdout, stderr) {
        if (error) {
            console.error("exec error: " + error);
            return;
        }
        console.log("stdout: " + stdout);
        console.log("stderr: " + stderr);
    });
}
function startCommandLine(scmd) {
    var cmd = scmd.concrete;
    child_process_1.exec(cmd, function (error, stdout, stderr) {
        if (error) {
            console.error("exec error: " + error);
            return;
        }
        console.log("stdout: " + stdout);
        console.log("stderr: " + stderr);
    });
}
function expandContextIntoAction(oResult) {
    var pattern = oResult.action.pattern;
    Object.keys(oResult.context).forEach(function (sKey) {
        var regex = new RegExp('{' + sKey + '}', 'g');
        pattern = pattern.replace(regex, oResult.context[sKey]);
        pattern = pattern.replace(regex, oResult.context[sKey]);
    });
    oResult.action.concrete = pattern;
    return pattern;
}
exports.expandContextIntoAction = expandContextIntoAction;
/**
 * execute some starupt
 *
 */
function executeStartup(oResult, cb) {
    if (oResult.type !== 1 /* EXEC */) {
            return;
        }
    var action = oResult.action;
    if (oResult.action.type === 0 /* STARTURL */) {
            //var ptn = expandParametersInURL(oResult)
            startBrowser(action);
            return action.concrete;
        } else if (oResult.action.type === 1 /* STARTCMDLINE */) {
            startCommandLine(action);
        } else {
        var s = "Don't know how to start " + oResult.type + '\n for "' + oResult.query + '"';
        console.error(s);
        return s;
    }
}
function expandParametersInURL(oMergedContextResult) {
    var ptn = oMergedContextResult.result.pattern;
    Object.keys(oMergedContextResult.context).forEach(function (sKey) {
        var regex = new RegExp('{' + sKey + '}', 'g');
        ptn = ptn.replace(regex, oMergedContextResult.context[sKey]);
        ptn = ptn.replace(regex, oMergedContextResult.context[sKey]);
    });
    return ptn;
}
var inputFilterRules = require("../match/inputFilterRules");
var toolExecutors = {
    "xFLP": {},
    "xFLPD": {},
    "unit test": function unitTest(match) {
        var unittest = match.toolmatchresult.required["unit test"].matchedString;
        var url = inputFilterRules.getUnitTestUrl(unittest);
        return {
            text: "starting unit test \"" + unittest + "\"" + (url ? ' with url ' + url : 'no url :-('),
            action: { url: url }
        };
    },
    "wiki": function wiki(match) {
        var wiki = match.toolmatchresult.required["wiki"].matchedString;
        var url = inputFilterRules.getWikiUrl(wiki);
        return {
            text: "starting wiki " + wiki + (url ? ' with url ' + url : 'no url :-('),
            action: { url: url }
        };
    }
};
function execTool(match, bExplain) {
    //
    var exec = undefined;
    if (toolExecutors[match.tool.name]) {
        exec = toolExecutors[match.tool.name](match);
    }
    if (!exec) {
        exec = {
            text: "don't know how to execute " + match.tool.name + '\n'
        };
    }
    if (bExplain) {
        exec.text = exec.text + "\n" + Match.ToolMatch.dumpNice(match);
    }
    return exec;
    // TODO invoke tool specific starter
    /* if (oMergedContextResult.result.type === 'URL') {
      var ptn = expandParametersInURL(oMergedContextResult)
      startBrowser(ptn)
      return ptn
    } else {
      var s = ("Don't know how to start " + oMergedContextResult.result.type + '\n for "' + oMergedContextResult.query + '"')
      debuglog(s)
      return s
    }*/
}
exports.execTool = execTool;
//  executeStartup: executeStartup
//}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4ZWMvZXhlYy5qcyIsIi4uL3NyYy9leGVjL2V4ZWMudHMiXSwibmFtZXMiOlsiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwidmFsdWUiLCJkZWJ1ZyIsInJlcXVpcmUiLCJJRk1hdGNoIiwiZGVidWdsb2ciLCJjaGlsZF9wcm9jZXNzXzEiLCJNYXRjaCIsIkVudW1SZXNwb25zZUNvZGUiLCJzdGFydEJyb3dzZXIiLCJvVXJsQWN0aW9uIiwiY21kIiwiY29uY3JldGUiLCJleGVjIiwiZXJyb3IiLCJzdGRvdXQiLCJzdGRlcnIiLCJjb25zb2xlIiwibG9nIiwic3RhcnRDb21tYW5kTGluZSIsInNjbWQiLCJleHBhbmRDb250ZXh0SW50b0FjdGlvbiIsIm9SZXN1bHQiLCJwYXR0ZXJuIiwiYWN0aW9uIiwia2V5cyIsImNvbnRleHQiLCJmb3JFYWNoIiwic0tleSIsInJlZ2V4IiwiUmVnRXhwIiwicmVwbGFjZSIsImV4ZWN1dGVTdGFydHVwIiwiY2IiLCJ0eXBlIiwicyIsInF1ZXJ5IiwiZXhwYW5kUGFyYW1ldGVyc0luVVJMIiwib01lcmdlZENvbnRleHRSZXN1bHQiLCJwdG4iLCJyZXN1bHQiLCJpbnB1dEZpbHRlclJ1bGVzIiwidG9vbEV4ZWN1dG9ycyIsIm1hdGNoIiwidW5pdHRlc3QiLCJ0b29sbWF0Y2hyZXN1bHQiLCJyZXF1aXJlZCIsIm1hdGNoZWRTdHJpbmciLCJ1cmwiLCJnZXRVbml0VGVzdFVybCIsInRleHQiLCJ3aWtpIiwiZ2V0V2lraVVybCIsImV4ZWNUb29sIiwiYkV4cGxhaW4iLCJ1bmRlZmluZWQiLCJ0b29sIiwibmFtZSIsIlRvb2xNYXRjaCIsImR1bXBOaWNlIl0sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7O0FET0FBLE9BQU9DLGNBQVAsQ0FBc0JDLE9BQXRCLEVBQStCLFlBQS9CLEVBQTZDLEVBQUVDLE9BQU8sSUFBVCxFQUE3QztBQ0VBLElBQUFDLFFBQUFDLFFBQUEsT0FBQSxDQUFBO0FBRUEsSUFBQUMs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IjoiZXhlYy9leGVjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG4vKipcbiAqIEZ1bmN0aW9uYWxpdHkgdG8gZXhlY3V0ZSBhIGNlcnRhaW4gcmVzcG9uc2VcbiAqXG4gKiB2aWEgYSkgY29tbWFuZGxpbmUgKGUuZy4gYnJvd3NlciBzdGFydHVwKVxuICogQGZpbGVcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpO1xudmFyIElGTWF0Y2ggPSByZXF1aXJlKFwiLi4vbWF0Y2gvaWZtYXRjaFwiKTtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdkaXNwYXRjaGVyJyk7XG52YXIgY2hpbGRfcHJvY2Vzc18xID0gcmVxdWlyZShcImNoaWxkX3Byb2Nlc3NcIik7XG52YXIgTWF0Y2ggPSByZXF1aXJlKFwiLi4vbWF0Y2gvbWF0Y2hcIik7XG52YXIgRW51bVJlc3BvbnNlQ29kZTtcbihmdW5jdGlvbiAoRW51bVJlc3BvbnNlQ29kZSkge1xuICAgIEVudW1SZXNwb25zZUNvZGVbRW51bVJlc3BvbnNlQ29kZVtcIk5PTUFUQ0hcIl0gPSAwXSA9IFwiTk9NQVRDSFwiO1xuICAgIEVudW1SZXNwb25zZUNvZGVbRW51bVJlc3BvbnNlQ29kZVtcIkVYRUNcIl0gPSAxXSA9IFwiRVhFQ1wiO1xuICAgIEVudW1SZXNwb25zZUNvZGVbRW51bVJlc3BvbnNlQ29kZVtcIlFVRVJZXCJdID0gMl0gPSBcIlFVRVJZXCI7XG59KShFbnVtUmVzcG9uc2VDb2RlID0gZXhwb3J0cy5FbnVtUmVzcG9uc2VDb2RlIHx8IChleHBvcnRzLkVudW1SZXNwb25zZUNvZGUgPSB7fSkpO1xuLyoqXG4gKiBEZWZpbmVzIHRoZSBpbnRlcmZhY2UgZm9yIGFuIGFuYWx5c2lzXG4gKiByZXBvbnNlXG4gKi9cbi8qXG5leHBvcnQgaW50ZXJmYWNlIElSZXNwb25zZSB7XG4gIHJhdGluZyA6IG51bWJlcixcbiAgdHlwZSA6IEVudW1SZXNwb25zZUNvZGUsXG4gIHF1ZXJ5IDogc3RyaW5nLFxuICBjb250ZXh0IDogeyBba2V5OnN0cmluZ10gOnN0cmluZ30sXG4gIHRleHQgOiBzdHJpbmcsXG4gIGFjdGlvbiA6IElBY3Rpb24sXG4gIHByb21wdHMgOiB7IFtrZXkgOnN0cmluZyBdIDogeyB0ZXh0IDogc3RyaW5nLCBkZXNjcmlwdGlvbiA6IGFueSB9OyB9XG5cclxuXHJcbmV4cG9ydCBjb25zdCBlbnVtIEVudW1BY3Rpb25UeXBlIHtcbiAgU1RBUlRVUkwsXG4gIFNUQVJUQ01ETElORVxufVxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUFjdGlvbiB7XG4gIGRhdGEgOiBhbnksXG4gIHR5cGUgOiBFbnVtQWN0aW9uVHlwZSxcbiAgcGF0dGVybiA6IHN0cmluZyxcbiAgY29uY3JldGUgOiBzdHJpbmdcbn1cbn0qL1xuLy92YXIgZXhlYyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5leGVjXG5mdW5jdGlvbiBzdGFydEJyb3dzZXIob1VybEFjdGlvbikge1xuICAgIHZhciBjbWQgPSAnXCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxcXEdvb2dsZVxcXFxDaHJvbWVcXFxcQXBwbGljYXRpb25cXFxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgXCInICsgb1VybEFjdGlvbi5jb25jcmV0ZSArICdcIic7XG4gICAgY2hpbGRfcHJvY2Vzc18xLmV4ZWMoY21kLCBmdW5jdGlvbiAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcImV4ZWMgZXJyb3I6IFwiICsgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3Rkb3V0OiBcIiArIHN0ZG91dCk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3RkZXJyOiBcIiArIHN0ZGVycik7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBzdGFydENvbW1hbmRMaW5lKHNjbWQpIHtcbiAgICB2YXIgY21kID0gc2NtZC5jb25jcmV0ZTtcbiAgICBjaGlsZF9wcm9jZXNzXzEuZXhlYyhjbWQsIGZ1bmN0aW9uIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiZXhlYyBlcnJvcjogXCIgKyBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coXCJzdGRvdXQ6IFwiICsgc3Rkb3V0KTtcbiAgICAgICAgY29uc29sZS5sb2coXCJzdGRlcnI6IFwiICsgc3RkZXJyKTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGV4cGFuZENvbnRleHRJbnRvQWN0aW9uKG9SZXN1bHQpIHtcbiAgICB2YXIgcGF0dGVybiA9IG9SZXN1bHQuYWN0aW9uLnBhdHRlcm47XG4gICAgT2JqZWN0LmtleXMob1Jlc3VsdC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ3snICsgc0tleSArICd9JywgJ2cnKTtcbiAgICAgICAgcGF0dGVybiA9IHBhdHRlcm4ucmVwbGFjZShyZWdleCwgb1Jlc3VsdC5jb250ZXh0W3NLZXldKTtcbiAgICAgICAgcGF0dGVybiA9IHBhdHRlcm4ucmVwbGFjZShyZWdleCwgb1Jlc3VsdC5jb250ZXh0W3NLZXldKTtcbiAgICB9KTtcbiAgICBvUmVzdWx0LmFjdGlvbi5jb25jcmV0ZSA9IHBhdHRlcm47XG4gICAgcmV0dXJuIHBhdHRlcm47XG59XG5leHBvcnRzLmV4cGFuZENvbnRleHRJbnRvQWN0aW9uID0gZXhwYW5kQ29udGV4dEludG9BY3Rpb247XG4vKipcbiAqIGV4ZWN1dGUgc29tZSBzdGFydXB0XG4gKlxuICovXG5mdW5jdGlvbiBleGVjdXRlU3RhcnR1cChvUmVzdWx0LCBjYikge1xuICAgIGlmIChvUmVzdWx0LnR5cGUgIT09IDEgLyogRVhFQyAqLykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBhY3Rpb24gPSBvUmVzdWx0LmFjdGlvbjtcbiAgICBpZiAob1Jlc3VsdC5hY3Rpb24udHlwZSA9PT0gMCAvKiBTVEFSVFVSTCAqLykge1xuICAgICAgICAvL3ZhciBwdG4gPSBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob1Jlc3VsdClcbiAgICAgICAgc3RhcnRCcm93c2VyKGFjdGlvbik7XG4gICAgICAgIHJldHVybiBhY3Rpb24uY29uY3JldGU7XG4gICAgfVxuICAgIGVsc2UgaWYgKG9SZXN1bHQuYWN0aW9uLnR5cGUgPT09IDEgLyogU1RBUlRDTURMSU5FICovKSB7XG4gICAgICAgIHN0YXJ0Q29tbWFuZExpbmUoYWN0aW9uKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBzID0gKFwiRG9uJ3Qga25vdyBob3cgdG8gc3RhcnQgXCIgKyBvUmVzdWx0LnR5cGUgKyAnXFxuIGZvciBcIicgKyBvUmVzdWx0LnF1ZXJ5ICsgJ1wiJyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3Iocyk7XG4gICAgICAgIHJldHVybiBzO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGV4cGFuZFBhcmFtZXRlcnNJblVSTChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xuICAgIHZhciBwdG4gPSBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQucGF0dGVybjtcbiAgICBPYmplY3Qua2V5cyhvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ3snICsgc0tleSArICd9JywgJ2cnKTtcbiAgICAgICAgcHRuID0gcHRuLnJlcGxhY2UocmVnZXgsIG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHRbc0tleV0pO1xuICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHB0bjtcbn1cbnZhciBpbnB1dEZpbHRlclJ1bGVzID0gcmVxdWlyZShcIi4uL21hdGNoL2lucHV0RmlsdGVyUnVsZXNcIik7XG52YXIgdG9vbEV4ZWN1dG9ycyA9IHtcbiAgICBcInhGTFBcIjoge30sXG4gICAgXCJ4RkxQRFwiOiB7fSxcbiAgICBcInVuaXQgdGVzdFwiOiBmdW5jdGlvbiAobWF0Y2gpIHtcbiAgICAgICAgdmFyIHVuaXR0ZXN0ID0gbWF0Y2gudG9vbG1hdGNocmVzdWx0LnJlcXVpcmVkW1widW5pdCB0ZXN0XCJdLm1hdGNoZWRTdHJpbmc7XG4gICAgICAgIHZhciB1cmwgPSBpbnB1dEZpbHRlclJ1bGVzLmdldFVuaXRUZXN0VXJsKHVuaXR0ZXN0KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRleHQ6IFwic3RhcnRpbmcgdW5pdCB0ZXN0IFxcXCJcIiArIHVuaXR0ZXN0ICsgXCJcXFwiXCIgKyAodXJsID8gKCcgd2l0aCB1cmwgJyArIHVybCkgOiAnbm8gdXJsIDotKCcpLFxuICAgICAgICAgICAgYWN0aW9uOiB7IHVybDogdXJsIH1cbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFwid2lraVwiOiBmdW5jdGlvbiAobWF0Y2gpIHtcbiAgICAgICAgdmFyIHdpa2kgPSBtYXRjaC50b29sbWF0Y2hyZXN1bHQucmVxdWlyZWRbXCJ3aWtpXCJdLm1hdGNoZWRTdHJpbmc7XG4gICAgICAgIHZhciB1cmwgPSBpbnB1dEZpbHRlclJ1bGVzLmdldFdpa2lVcmwod2lraSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0ZXh0OiBcInN0YXJ0aW5nIHdpa2kgXCIgKyB3aWtpICsgKHVybCA/ICgnIHdpdGggdXJsICcgKyB1cmwpIDogJ25vIHVybCA6LSgnKSxcbiAgICAgICAgICAgIGFjdGlvbjogeyB1cmw6IHVybCB9XG4gICAgICAgIH07XG4gICAgfVxufTtcbmZ1bmN0aW9uIGV4ZWNUb29sKG1hdGNoLCBiRXhwbGFpbikge1xuICAgIC8vXG4gICAgdmFyIGV4ZWMgPSB1bmRlZmluZWQ7XG4gICAgaWYgKHRvb2xFeGVjdXRvcnNbbWF0Y2gudG9vbC5uYW1lXSkge1xuICAgICAgICBleGVjID0gdG9vbEV4ZWN1dG9yc1ttYXRjaC50b29sLm5hbWVdKG1hdGNoKTtcbiAgICB9XG4gICAgaWYgKCFleGVjKSB7XG4gICAgICAgIGV4ZWMgPSB7XG4gICAgICAgICAgICB0ZXh0OiBcImRvbid0IGtub3cgaG93IHRvIGV4ZWN1dGUgXCIgKyBtYXRjaC50b29sLm5hbWUgKyAnXFxuJ1xuICAgICAgICB9O1xuICAgIH1cbiAgICBpZiAoYkV4cGxhaW4pIHtcbiAgICAgICAgZXhlYy50ZXh0ID0gZXhlYy50ZXh0ICsgXCJcXG5cIiArIE1hdGNoLlRvb2xNYXRjaC5kdW1wTmljZShtYXRjaCk7XG4gICAgfVxuICAgIHJldHVybiBleGVjO1xuICAgIC8vIFRPRE8gaW52b2tlIHRvb2wgc3BlY2lmaWMgc3RhcnRlclxuICAgIC8qIGlmIChvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSA9PT0gJ1VSTCcpIHtcbiAgICAgIHZhciBwdG4gPSBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpXG4gICAgICBzdGFydEJyb3dzZXIocHRuKVxuICAgICAgcmV0dXJuIHB0blxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcyA9IChcIkRvbid0IGtub3cgaG93IHRvIHN0YXJ0IFwiICsgb01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnR5cGUgKyAnXFxuIGZvciBcIicgKyBvTWVyZ2VkQ29udGV4dFJlc3VsdC5xdWVyeSArICdcIicpXG4gICAgICBkZWJ1Z2xvZyhzKVxuICAgICAgcmV0dXJuIHNcbiAgICB9Ki9cbn1cbmV4cG9ydHMuZXhlY1Rvb2wgPSBleGVjVG9vbDtcbi8vICBleGVjdXRlU3RhcnR1cDogZXhlY3V0ZVN0YXJ0dXBcbi8vfVxuIiwiLyoqXHJcbiAqIEZ1bmN0aW9uYWxpdHkgdG8gZXhlY3V0ZSBhIGNlcnRhaW4gcmVzcG9uc2VcclxuICpcclxuICogdmlhIGEpIGNvbW1hbmRsaW5lIChlLmcuIGJyb3dzZXIgc3RhcnR1cClcclxuICogQGZpbGVcclxuICovXHJcblxyXG5pbXBvcnQgKiBhcyBpbnRmIGZyb20gJ2NvbnN0YW50cyc7XHJcblxyXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcblxyXG5pbXBvcnQgKiAgYXMgSUZNYXRjaCBmcm9tICcuLi9tYXRjaC9pZm1hdGNoJztcclxuXHJcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2Rpc3BhdGNoZXInKVxyXG5cclxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG5cclxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xyXG5pbXBvcnQgKiBhcyBNYXRjaCBmcm9tICcuLi9tYXRjaC9tYXRjaCc7XHJcblxyXG5cclxuZXhwb3J0IGNvbnN0IGVudW0gRW51bVJlc3BvbnNlQ29kZSB7XHJcbiAgTk9NQVRDSCA9IDAsXHJcbiAgRVhFQyxcclxuICBRVUVSWVxyXG59XHJcblxyXG4vKipcclxuICogRGVmaW5lcyB0aGUgaW50ZXJmYWNlIGZvciBhbiBhbmFseXNpc1xyXG4gKiByZXBvbnNlXHJcbiAqL1xyXG4vKlxyXG5leHBvcnQgaW50ZXJmYWNlIElSZXNwb25zZSB7XHJcbiAgcmF0aW5nIDogbnVtYmVyLFxyXG4gIHR5cGUgOiBFbnVtUmVzcG9uc2VDb2RlLFxyXG4gIHF1ZXJ5IDogc3RyaW5nLFxyXG4gIGNvbnRleHQgOiB7IFtrZXk6c3RyaW5nXSA6c3RyaW5nfSxcclxuICB0ZXh0IDogc3RyaW5nLFxyXG4gIGFjdGlvbiA6IElBY3Rpb24sXHJcbiAgcHJvbXB0cyA6IHsgW2tleSA6c3RyaW5nIF0gOiB7IHRleHQgOiBzdHJpbmcsIGRlc2NyaXB0aW9uIDogYW55IH07IH1cclxuXHJcblxyXG5leHBvcnQgY29uc3QgZW51bSBFbnVtQWN0aW9uVHlwZSB7XHJcbiAgU1RBUlRVUkwsXHJcbiAgU1RBUlRDTURMSU5FXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUFjdGlvbiB7XHJcbiAgZGF0YSA6IGFueSxcclxuICB0eXBlIDogRW51bUFjdGlvblR5cGUsXHJcbiAgcGF0dGVybiA6IHN0cmluZyxcclxuICBjb25jcmV0ZSA6IHN0cmluZ1xyXG59XHJcbn0qL1xyXG5cclxuLy92YXIgZXhlYyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5leGVjXHJcblxyXG5mdW5jdGlvbiBzdGFydEJyb3dzZXIgKG9VcmxBY3Rpb24gOiBJRk1hdGNoLklBY3Rpb24pIHtcclxuICB2YXIgY21kID1cclxuICAnXCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxcXEdvb2dsZVxcXFxDaHJvbWVcXFxcQXBwbGljYXRpb25cXFxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgXCInICsgb1VybEFjdGlvbi5jb25jcmV0ZSArICdcIidcclxuICBleGVjKGNtZCwgZnVuY3Rpb24gKGVycm9yLCBzdGRvdXQsIHN0ZGVycikge1xyXG4gICAgaWYgKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYGV4ZWMgZXJyb3I6ICR7ZXJyb3J9YClcclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZyhgc3Rkb3V0OiAke3N0ZG91dH1gKVxyXG4gICAgY29uc29sZS5sb2coYHN0ZGVycjogJHtzdGRlcnJ9YClcclxuICB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBzdGFydENvbW1hbmRMaW5lIChzY21kIDogSUZNYXRjaC5JQWN0aW9uKSB7XHJcbiAgdmFyIGNtZCA9IHNjbWQuY29uY3JldGU7XHJcbiAgZXhlYyhjbWQsIGZ1bmN0aW9uIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpIHtcclxuICAgIGlmIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGBleGVjIGVycm9yOiAke2Vycm9yfWApXHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coYHN0ZG91dDogJHtzdGRvdXR9YClcclxuICAgIGNvbnNvbGUubG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApXHJcbiAgfSlcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHBhbmRDb250ZXh0SW50b0FjdGlvbiAob1Jlc3VsdCA6IElGTWF0Y2guSVJlc3BvbnNlKSB7XHJcbiAgdmFyIHBhdHRlcm4gPSBvUmVzdWx0LmFjdGlvbi5wYXR0ZXJuXHJcbiAgT2JqZWN0LmtleXMob1Jlc3VsdC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCd7JyArIHNLZXkgKyAnfScsICdnJylcclxuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnJlcGxhY2UocmVnZXgsIG9SZXN1bHQuY29udGV4dFtzS2V5XSlcclxuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnJlcGxhY2UocmVnZXgsIG9SZXN1bHQuY29udGV4dFtzS2V5XSlcclxuICB9KVxyXG4gIG9SZXN1bHQuYWN0aW9uLmNvbmNyZXRlID0gcGF0dGVybjtcclxuICByZXR1cm4gcGF0dGVyblxyXG59XHJcblxyXG4vKipcclxuICogZXhlY3V0ZSBzb21lIHN0YXJ1cHRcclxuICpcclxuICovXHJcbmZ1bmN0aW9uIGV4ZWN1dGVTdGFydHVwIChvUmVzdWx0OiBJRk1hdGNoLklSZXNwb25zZSwgY2I6IChlcnIgOiBhbnksIGEgOiBJRk1hdGNoLklSZXNwb25zZSkgPT4gc3RyaW5nKSB7XHJcbiAgaWYgKG9SZXN1bHQudHlwZSAhPT0gSUZNYXRjaC5FbnVtUmVzcG9uc2VDb2RlLkVYRUMpIHtcclxuICAgIHJldHVyblxyXG4gIH1cclxuICB2YXIgYWN0aW9uID0gb1Jlc3VsdC5hY3Rpb247XHJcbiAgaWYob1Jlc3VsdC5hY3Rpb24udHlwZSA9PT0gSUZNYXRjaC5FbnVtQWN0aW9uVHlwZS5TVEFSVFVSTCkge1xyXG4gICAgLy92YXIgcHRuID0gZXhwYW5kUGFyYW1ldGVyc0luVVJMKG9SZXN1bHQpXHJcbiAgICBzdGFydEJyb3dzZXIoYWN0aW9uKVxyXG4gICAgcmV0dXJuIGFjdGlvbi5jb25jcmV0ZVxyXG4gIH0gZWxzZSBpZihvUmVzdWx0LmFjdGlvbi50eXBlID09PSBJRk1hdGNoLkVudW1BY3Rpb25UeXBlLlNUQVJUQ01ETElORSkge1xyXG4gICAgc3RhcnRDb21tYW5kTGluZShhY3Rpb24pO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB2YXIgcyA9IChcIkRvbid0IGtub3cgaG93IHRvIHN0YXJ0IFwiICsgb1Jlc3VsdC50eXBlICsgJ1xcbiBmb3IgXCInICsgb1Jlc3VsdC5xdWVyeSArICdcIicpXHJcbiAgICBjb25zb2xlLmVycm9yKHMpXHJcbiAgICByZXR1cm4gc1xyXG4gIH1cclxufVxyXG5cclxuICBmdW5jdGlvbiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwgKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XHJcbiAgICB2YXIgcHRuID0gb01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnBhdHRlcm5cclxuICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgneycgKyBzS2V5ICsgJ30nLCAnZycpXHJcbiAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxyXG4gICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcclxuICAgIH0pXHJcbiAgICByZXR1cm4gcHRuXHJcbiAgfVxyXG5cclxuaW1wb3J0ICogYXMgaW5wdXRGaWx0ZXJSdWxlcyBmcm9tICcuLi9tYXRjaC9pbnB1dEZpbHRlclJ1bGVzJztcclxuXHJcbnZhciB0b29sRXhlY3V0b3JzID0ge1xyXG4gIFwieEZMUFwiOiB7fSxcclxuICBcInhGTFBEXCIgOiB7fSxcclxuICBcInVuaXQgdGVzdFwiIDogZnVuY3Rpb24obWF0Y2ggOiBJRk1hdGNoLklUb29sTWF0Y2gpIHtcclxuICAgIHZhciB1bml0dGVzdCA9IG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5yZXF1aXJlZFtcInVuaXQgdGVzdFwiXS5tYXRjaGVkU3RyaW5nO1xyXG4gICAgdmFyIHVybCA9IGlucHV0RmlsdGVyUnVsZXMuZ2V0VW5pdFRlc3RVcmwodW5pdHRlc3QpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdGV4dCA6IFwic3RhcnRpbmcgdW5pdCB0ZXN0IFxcXCJcIiArIHVuaXR0ZXN0ICsgXCJcXFwiXCIrICAodXJsPyAgKCcgd2l0aCB1cmwgJyArIHVybCApIDogJ25vIHVybCA6LSgnICksXHJcbiAgICAgIGFjdGlvbiA6IHsgdXJsOiB1cmwgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgXCJ3aWtpXCIgOiBmdW5jdGlvbihtYXRjaCA6IElGTWF0Y2guSVRvb2xNYXRjaCkge1xyXG4gICAgdmFyIHdpa2kgPSBtYXRjaC50b29sbWF0Y2hyZXN1bHQucmVxdWlyZWRbXCJ3aWtpXCJdLm1hdGNoZWRTdHJpbmc7XHJcbiAgICB2YXIgdXJsID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRXaWtpVXJsKHdpa2kpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdGV4dCA6IFwic3RhcnRpbmcgd2lraSBcIiArIHdpa2kgKyAodXJsPyAgKCcgd2l0aCB1cmwgJyArIHVybCApIDogJ25vIHVybCA6LSgnICksXHJcbiAgICAgIGFjdGlvbiA6IHsgdXJsOiB1cmwgfVxyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleGVjVG9vbChtYXRjaDogSU1hdGNoLklUb29sTWF0Y2gsIGJFeHBsYWluPyA6IGJvb2xlYW4pIDogeyB0ZXh0IDogc3RyaW5nLFxyXG4gICAgICBhY3Rpb24gOiBhbnkgfSB7XHJcbiAgICAgICAgLy9cclxuICAgIHZhciBleGVjID0gdW5kZWZpbmVkO1xyXG4gICAgaWYgKHRvb2xFeGVjdXRvcnNbbWF0Y2gudG9vbC5uYW1lXSkge1xyXG4gICAgICBleGVjID0gdG9vbEV4ZWN1dG9yc1ttYXRjaC50b29sLm5hbWVdKG1hdGNoKTtcclxuXHJcbiAgICB9XHJcbiAgICBpZiAoIWV4ZWMpIHtcclxuICAgICAgZXhlYyA9IHtcclxuICAgICAgICB0ZXh0IDogXCJkb24ndCBrbm93IGhvdyB0byBleGVjdXRlIFwiICsgbWF0Y2gudG9vbC5uYW1lICsgJ1xcbidcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKCBiRXhwbGFpbiApIHtcclxuICAgICAgZXhlYy50ZXh0ID0gZXhlYy50ZXh0ICsgXCJcXG5cIiArIE1hdGNoLlRvb2xNYXRjaC5kdW1wTmljZShtYXRjaCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZXhlYztcclxuXHJcbiAgICAvLyBUT0RPIGludm9rZSB0b29sIHNwZWNpZmljIHN0YXJ0ZXJcclxuICAgIC8qIGlmIChvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSA9PT0gJ1VSTCcpIHtcclxuICAgICAgdmFyIHB0biA9IGV4cGFuZFBhcmFtZXRlcnNJblVSTChvTWVyZ2VkQ29udGV4dFJlc3VsdClcclxuICAgICAgc3RhcnRCcm93c2VyKHB0bilcclxuICAgICAgcmV0dXJuIHB0blxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdmFyIHMgPSAoXCJEb24ndCBrbm93IGhvdyB0byBzdGFydCBcIiArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC50eXBlICsgJ1xcbiBmb3IgXCInICsgb01lcmdlZENvbnRleHRSZXN1bHQucXVlcnkgKyAnXCInKVxyXG4gICAgICBkZWJ1Z2xvZyhzKVxyXG4gICAgICByZXR1cm4gc1xyXG4gICAgfSovXHJcbiAgfVxyXG5cclxuXHJcbi8vICBleGVjdXRlU3RhcnR1cDogZXhlY3V0ZVN0YXJ0dXBcclxuLy99XHJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
