/**
 * Functionality to execute a certain response
 *
 * via a) commandline (e.g. browser startup)
 * @file
 */
"use strict";

var debug = require('debug');
var IFMatch = require('../match/ifmatch');
var debuglog = debug('dispatcher');
var child_process_1 = require('child_process');
(function (EnumResponseCode) {
    EnumResponseCode[EnumResponseCode["NOMATCH"] = 0] = "NOMATCH";
    EnumResponseCode[EnumResponseCode["EXEC"] = 1] = "EXEC";
    EnumResponseCode[EnumResponseCode["QUERY"] = 2] = "QUERY";
})(exports.EnumResponseCode || (exports.EnumResponseCode = {}));
var EnumResponseCode = exports.EnumResponseCode;
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
            console.error('exec error: ' + error);
            return;
        }
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
    });
}
function startCommandLine(scmd) {
    var cmd = scmd.concrete;
    child_process_1.exec(cmd, function (error, stdout, stderr) {
        if (error) {
            console.error('exec error: ' + error);
            return;
        }
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
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
module.exports = {
    executeStartup: executeStartup
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9leGVjL2V4ZWMudHMiLCJleGVjL2V4ZWMuanMiXSwibmFtZXMiOlsiZGVidWciLCJyZXF1aXJlIiwiSUZNYXRjaCIsImRlYnVnbG9nIiwiY2hpbGRfcHJvY2Vzc18xIiwiRW51bVJlc3BvbnNlQ29kZSIsImV4cG9ydHMiLCJzdGFydEJyb3dzZXIiLCJvVXJsQWN0aW9uIiwiY21kIiwiY29uY3JldGUiLCJleGVjIiwiZXJyb3IiLCJzdGRvdXQiLCJzdGRlcnIiLCJjb25zb2xlIiwibG9nIiwic3RhcnRDb21tYW5kTGluZSIsInNjbWQiLCJleHBhbmRDb250ZXh0SW50b0FjdGlvbiIsIm9SZXN1bHQiLCJwYXR0ZXJuIiwiYWN0aW9uIiwiT2JqZWN0Iiwia2V5cyIsImNvbnRleHQiLCJmb3JFYWNoIiwic0tleSIsInJlZ2V4IiwiUmVnRXhwIiwicmVwbGFjZSIsImV4ZWN1dGVTdGFydHVwIiwiY2IiLCJ0eXBlIiwicyIsInF1ZXJ5IiwibW9kdWxlIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0FDTUE7O0FER0EsSUFBWUEsUUFBS0MsUUFBTSxPQUFOLENBQWpCO0FBRUEsSUFBYUMsVUFBT0QsUUFBTSxrQkFBTixDQUFwQjtBQUVBLElBQU1FLFdBQVdILE1BQU0sWUFBTixDQUFqQjtBQUVBLElBQUFJLGtCQUFBSCxRQUFxQixlQUFyQixDQUFBO0FBR0EsQ0FBQSxVQUFrQkksZ0JBQWxCLEVBQWtDO0FBQ2hDQSxxQkFBQUEsaUJBQUEsU0FBQSxJQUFBLENBQUEsSUFBQSxTQUFBO0FBQ0FBLHFCQUFBQSxpQkFBQSxNQUFBLElBQUEsQ0FBQSxJQUFBLE1BQUE7QUFDQUEscUJBQUFBLGlCQUFBLE9BQUEsSUFBQSxDQUFBLElBQUEsT0FBQTtBQUNELENBSkQsRUFBa0JDLFFBQUFELGdCQUFBLEtBQUFDLFFBQUFELGdCQUFBLEdBQWdCLEVBQWhCLENBQWxCO0FBQUEsSUFBa0JBLG1CQUFBQyxRQUFBRCxnQkFBbEI7QUFNQTs7OztBQUlBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXdCQTtBQUVBLFNBQUFFLFlBQUEsQ0FBdUJDLFVBQXZCLEVBQW1EO0FBQ2pELFFBQUlDLE1BQ0osc0ZBQXNGRCxXQUFXRSxRQUFqRyxHQUE0RyxHQUQ1RztBQUVBTixvQkFBQU8sSUFBQSxDQUFLRixHQUFMLEVBQVUsVUFBVUcsS0FBVixFQUFpQkMsTUFBakIsRUFBeUJDLE1BQXpCLEVBQStCO0FBQ3ZDLFlBQUlGLEtBQUosRUFBVztBQUNURyxvQkFBUUgsS0FBUixrQkFBNkJBLEtBQTdCO0FBQ0E7QUFDRDtBQUNERyxnQkFBUUMsR0FBUixjQUF1QkgsTUFBdkI7QUFDQUUsZ0JBQVFDLEdBQVIsY0FBdUJGLE1BQXZCO0FBQ0QsS0FQRDtBQVFEO0FBRUQsU0FBQUcsZ0JBQUEsQ0FBMkJDLElBQTNCLEVBQWlEO0FBQy9DLFFBQUlULE1BQU1TLEtBQUtSLFFBQWY7QUFDQU4sb0JBQUFPLElBQUEsQ0FBS0YsR0FBTCxFQUFVLFVBQVVHLEtBQVYsRUFBaUJDLE1BQWpCLEVBQXlCQyxNQUF6QixFQUErQjtBQUN2QyxZQUFJRixLQUFKLEVBQVc7QUFDVEcsb0JBQVFILEtBQVIsa0JBQTZCQSxLQUE3QjtBQUNBO0FBQ0Q7QUFDREcsZ0JBQVFDLEdBQVIsY0FBdUJILE1BQXZCO0FBQ0FFLGdCQUFRQyxHQUFSLGNBQXVCRixNQUF2QjtBQUNELEtBUEQ7QUFRRDtBQUdELFNBQUFLLHVCQUFBLENBQXlDQyxPQUF6QyxFQUFvRTtBQUNsRSxRQUFJQyxVQUFVRCxRQUFRRSxNQUFSLENBQWVELE9BQTdCO0FBQ0FFLFdBQU9DLElBQVAsQ0FBWUosUUFBUUssT0FBcEIsRUFBNkJDLE9BQTdCLENBQXFDLFVBQVVDLElBQVYsRUFBYztBQUNqRCxZQUFJQyxRQUFRLElBQUlDLE1BQUosQ0FBVyxNQUFNRixJQUFOLEdBQWEsR0FBeEIsRUFBNkIsR0FBN0IsQ0FBWjtBQUNBTixrQkFBVUEsUUFBUVMsT0FBUixDQUFnQkYsS0FBaEIsRUFBdUJSLFFBQVFLLE9BQVIsQ0FBZ0JFLElBQWhCLENBQXZCLENBQVY7QUFDQU4sa0JBQVVBLFFBQVFTLE9BQVIsQ0FBZ0JGLEtBQWhCLEVBQXVCUixRQUFRSyxPQUFSLENBQWdCRSxJQUFoQixDQUF2QixDQUFWO0FBQ0QsS0FKRDtBQUtBUCxZQUFRRSxNQUFSLENBQWVaLFFBQWYsR0FBMEJXLE9BQTFCO0FBQ0EsV0FBT0EsT0FBUDtBQUNEO0FBVGVmLFFBQUFhLHVCQUFBLEdBQXVCQSx1QkFBdkI7QUFXaEI7Ozs7QUFJQSxTQUFBWSxjQUFBLENBQXlCWCxPQUF6QixFQUFxRFksRUFBckQsRUFBcUc7QUFDbkcsUUFBSVosUUFBUWEsSUFBUixLQUFpQixDQUFyQixDQUFxQixVQUFyQixFQUFvRDtBQUNsRDtBQUNEO0FBQ0QsUUFBSVgsU0FBU0YsUUFBUUUsTUFBckI7QUFDQSxRQUFHRixRQUFRRSxNQUFSLENBQWVXLElBQWYsS0FBd0IsQ0FBM0IsQ0FBMkIsY0FBM0IsRUFBNEQ7QUFDMUQ7QUFDQTFCLHlCQUFhZSxNQUFiO0FBQ0EsbUJBQU9BLE9BQU9aLFFBQWQ7QUFDRCxTQUpELE1BSU8sSUFBR1UsUUFBUUUsTUFBUixDQUFlVyxJQUFmLEtBQXdCLENBQTNCLENBQTJCLGtCQUEzQixFQUFnRTtBQUNyRWhCLDZCQUFpQkssTUFBakI7QUFDRCxTQUZNLE1BRUE7QUFDTCxZQUFJWSxJQUFLLDZCQUE2QmQsUUFBUWEsSUFBckMsR0FBNEMsVUFBNUMsR0FBeURiLFFBQVFlLEtBQWpFLEdBQXlFLEdBQWxGO0FBQ0FwQixnQkFBUUgsS0FBUixDQUFjc0IsQ0FBZDtBQUNBLGVBQU9BLENBQVA7QUFDRDtBQUNGO0FBRURFLE9BQU85QixPQUFQLEdBQWlCO0FBQ2Z5QixvQkFBZ0JBO0FBREQsQ0FBakIiLCJmaWxlIjoiZXhlYy9leGVjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEZ1bmN0aW9uYWxpdHkgdG8gZXhlY3V0ZSBhIGNlcnRhaW4gcmVzcG9uc2VcclxuICpcclxuICogdmlhIGEpIGNvbW1hbmRsaW5lIChlLmcuIGJyb3dzZXIgc3RhcnR1cClcclxuICogQGZpbGVcclxuICovXHJcblxyXG5pbXBvcnQgKiBhcyBpbnRmIGZyb20gJ2NvbnN0YW50cyc7XHJcblxyXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcblxyXG5pbXBvcnQgKiAgYXMgSUZNYXRjaCBmcm9tICcuLi9tYXRjaC9pZm1hdGNoJztcclxuXHJcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2Rpc3BhdGNoZXInKVxyXG5cclxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG5cclxuXHJcbmV4cG9ydCBjb25zdCBlbnVtIEVudW1SZXNwb25zZUNvZGUge1xyXG4gIE5PTUFUQ0ggPSAwLFxyXG4gIEVYRUMsXHJcbiAgUVVFUllcclxufVxyXG5cclxuLyoqXHJcbiAqIERlZmluZXMgdGhlIGludGVyZmFjZSBmb3IgYW4gYW5hbHlzaXNcclxuICogcmVwb25zZVxyXG4gKi9cclxuLypcclxuZXhwb3J0IGludGVyZmFjZSBJUmVzcG9uc2Uge1xyXG4gIHJhdGluZyA6IG51bWJlcixcclxuICB0eXBlIDogRW51bVJlc3BvbnNlQ29kZSxcclxuICBxdWVyeSA6IHN0cmluZyxcclxuICBjb250ZXh0IDogeyBba2V5OnN0cmluZ10gOnN0cmluZ30sXHJcbiAgdGV4dCA6IHN0cmluZyxcclxuICBhY3Rpb24gOiBJQWN0aW9uLFxyXG4gIHByb21wdHMgOiB7IFtrZXkgOnN0cmluZyBdIDogeyB0ZXh0IDogc3RyaW5nLCBkZXNjcmlwdGlvbiA6IGFueSB9OyB9XHJcblxyXG5cclxuZXhwb3J0IGNvbnN0IGVudW0gRW51bUFjdGlvblR5cGUge1xyXG4gIFNUQVJUVVJMLFxyXG4gIFNUQVJUQ01ETElORVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElBY3Rpb24ge1xyXG4gIGRhdGEgOiBhbnksXHJcbiAgdHlwZSA6IEVudW1BY3Rpb25UeXBlLFxyXG4gIHBhdHRlcm4gOiBzdHJpbmcsXHJcbiAgY29uY3JldGUgOiBzdHJpbmdcclxufVxyXG59Ki9cclxuXHJcbi8vdmFyIGV4ZWMgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuZXhlY1xyXG5cclxuZnVuY3Rpb24gc3RhcnRCcm93c2VyIChvVXJsQWN0aW9uIDogSUZNYXRjaC5JQWN0aW9uKSB7XHJcbiAgdmFyIGNtZCA9XHJcbiAgJ1wiJVByb2dyYW1GaWxlcyh4ODYpJVxcXFxHb29nbGVcXFxcQ2hyb21lXFxcXEFwcGxpY2F0aW9uXFxcXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIFwiJyArIG9VcmxBY3Rpb24uY29uY3JldGUgKyAnXCInXHJcbiAgZXhlYyhjbWQsIGZ1bmN0aW9uIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpIHtcclxuICAgIGlmIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGBleGVjIGVycm9yOiAke2Vycm9yfWApXHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coYHN0ZG91dDogJHtzdGRvdXR9YClcclxuICAgIGNvbnNvbGUubG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApXHJcbiAgfSlcclxufVxyXG5cclxuZnVuY3Rpb24gc3RhcnRDb21tYW5kTGluZSAoc2NtZCA6IElGTWF0Y2guSUFjdGlvbikge1xyXG4gIHZhciBjbWQgPSBzY21kLmNvbmNyZXRlO1xyXG4gIGV4ZWMoY21kLCBmdW5jdGlvbiAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSB7XHJcbiAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihgZXhlYyBlcnJvcjogJHtlcnJvcn1gKVxyXG4gICAgICByZXR1cm5cclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApXHJcbiAgICBjb25zb2xlLmxvZyhgc3RkZXJyOiAke3N0ZGVycn1gKVxyXG4gIH0pXHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXhwYW5kQ29udGV4dEludG9BY3Rpb24gKG9SZXN1bHQgOiBJRk1hdGNoLklSZXNwb25zZSkge1xyXG4gIHZhciBwYXR0ZXJuID0gb1Jlc3VsdC5hY3Rpb24ucGF0dGVyblxyXG4gIE9iamVjdC5rZXlzKG9SZXN1bHQuY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgneycgKyBzS2V5ICsgJ30nLCAnZycpXHJcbiAgICBwYXR0ZXJuID0gcGF0dGVybi5yZXBsYWNlKHJlZ2V4LCBvUmVzdWx0LmNvbnRleHRbc0tleV0pXHJcbiAgICBwYXR0ZXJuID0gcGF0dGVybi5yZXBsYWNlKHJlZ2V4LCBvUmVzdWx0LmNvbnRleHRbc0tleV0pXHJcbiAgfSlcclxuICBvUmVzdWx0LmFjdGlvbi5jb25jcmV0ZSA9IHBhdHRlcm47XHJcbiAgcmV0dXJuIHBhdHRlcm5cclxufVxyXG5cclxuLyoqXHJcbiAqIGV4ZWN1dGUgc29tZSBzdGFydXB0XHJcbiAqXHJcbiAqL1xyXG5mdW5jdGlvbiBleGVjdXRlU3RhcnR1cCAob1Jlc3VsdDogSUZNYXRjaC5JUmVzcG9uc2UsIGNiOiAoZXJyIDogYW55LCBhIDogSUZNYXRjaC5JUmVzcG9uc2UpID0+IHN0cmluZykge1xyXG4gIGlmIChvUmVzdWx0LnR5cGUgIT09IElGTWF0Y2guRW51bVJlc3BvbnNlQ29kZS5FWEVDKSB7XHJcbiAgICByZXR1cm5cclxuICB9XHJcbiAgdmFyIGFjdGlvbiA9IG9SZXN1bHQuYWN0aW9uO1xyXG4gIGlmKG9SZXN1bHQuYWN0aW9uLnR5cGUgPT09IElGTWF0Y2guRW51bUFjdGlvblR5cGUuU1RBUlRVUkwpIHtcclxuICAgIC8vdmFyIHB0biA9IGV4cGFuZFBhcmFtZXRlcnNJblVSTChvUmVzdWx0KVxyXG4gICAgc3RhcnRCcm93c2VyKGFjdGlvbilcclxuICAgIHJldHVybiBhY3Rpb24uY29uY3JldGVcclxuICB9IGVsc2UgaWYob1Jlc3VsdC5hY3Rpb24udHlwZSA9PT0gSUZNYXRjaC5FbnVtQWN0aW9uVHlwZS5TVEFSVENNRExJTkUpIHtcclxuICAgIHN0YXJ0Q29tbWFuZExpbmUoYWN0aW9uKTtcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIHMgPSAoXCJEb24ndCBrbm93IGhvdyB0byBzdGFydCBcIiArIG9SZXN1bHQudHlwZSArICdcXG4gZm9yIFwiJyArIG9SZXN1bHQucXVlcnkgKyAnXCInKVxyXG4gICAgY29uc29sZS5lcnJvcihzKVxyXG4gICAgcmV0dXJuIHNcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGV4ZWN1dGVTdGFydHVwOiBleGVjdXRlU3RhcnR1cFxyXG59XHJcbiIsIi8qKlxuICogRnVuY3Rpb25hbGl0eSB0byBleGVjdXRlIGEgY2VydGFpbiByZXNwb25zZVxuICpcbiAqIHZpYSBhKSBjb21tYW5kbGluZSAoZS5nLiBicm93c2VyIHN0YXJ0dXApXG4gKiBAZmlsZVxuICovXG5cInVzZSBzdHJpY3RcIjtcbmNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKTtcbmNvbnN0IElGTWF0Y2ggPSByZXF1aXJlKCcuLi9tYXRjaC9pZm1hdGNoJyk7XG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdkaXNwYXRjaGVyJyk7XG5jb25zdCBjaGlsZF9wcm9jZXNzXzEgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XG4oZnVuY3Rpb24gKEVudW1SZXNwb25zZUNvZGUpIHtcbiAgICBFbnVtUmVzcG9uc2VDb2RlW0VudW1SZXNwb25zZUNvZGVbXCJOT01BVENIXCJdID0gMF0gPSBcIk5PTUFUQ0hcIjtcbiAgICBFbnVtUmVzcG9uc2VDb2RlW0VudW1SZXNwb25zZUNvZGVbXCJFWEVDXCJdID0gMV0gPSBcIkVYRUNcIjtcbiAgICBFbnVtUmVzcG9uc2VDb2RlW0VudW1SZXNwb25zZUNvZGVbXCJRVUVSWVwiXSA9IDJdID0gXCJRVUVSWVwiO1xufSkoZXhwb3J0cy5FbnVtUmVzcG9uc2VDb2RlIHx8IChleHBvcnRzLkVudW1SZXNwb25zZUNvZGUgPSB7fSkpO1xudmFyIEVudW1SZXNwb25zZUNvZGUgPSBleHBvcnRzLkVudW1SZXNwb25zZUNvZGU7XG4vKipcbiAqIERlZmluZXMgdGhlIGludGVyZmFjZSBmb3IgYW4gYW5hbHlzaXNcbiAqIHJlcG9uc2VcbiAqL1xuLypcbmV4cG9ydCBpbnRlcmZhY2UgSVJlc3BvbnNlIHtcbiAgcmF0aW5nIDogbnVtYmVyLFxuICB0eXBlIDogRW51bVJlc3BvbnNlQ29kZSxcbiAgcXVlcnkgOiBzdHJpbmcsXG4gIGNvbnRleHQgOiB7IFtrZXk6c3RyaW5nXSA6c3RyaW5nfSxcbiAgdGV4dCA6IHN0cmluZyxcbiAgYWN0aW9uIDogSUFjdGlvbixcbiAgcHJvbXB0cyA6IHsgW2tleSA6c3RyaW5nIF0gOiB7IHRleHQgOiBzdHJpbmcsIGRlc2NyaXB0aW9uIDogYW55IH07IH1cblxuXG5leHBvcnQgY29uc3QgZW51bSBFbnVtQWN0aW9uVHlwZSB7XG4gIFNUQVJUVVJMLFxuICBTVEFSVENNRExJTkVcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJQWN0aW9uIHtcbiAgZGF0YSA6IGFueSxcbiAgdHlwZSA6IEVudW1BY3Rpb25UeXBlLFxuICBwYXR0ZXJuIDogc3RyaW5nLFxuICBjb25jcmV0ZSA6IHN0cmluZ1xufVxufSovXG4vL3ZhciBleGVjID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNcbmZ1bmN0aW9uIHN0YXJ0QnJvd3NlcihvVXJsQWN0aW9uKSB7XG4gICAgdmFyIGNtZCA9ICdcIiVQcm9ncmFtRmlsZXMoeDg2KSVcXFxcR29vZ2xlXFxcXENocm9tZVxcXFxBcHBsaWNhdGlvblxcXFxjaHJvbWUuZXhlXCIgLS1pbmNvZ25pdG8gLXVybCBcIicgKyBvVXJsQWN0aW9uLmNvbmNyZXRlICsgJ1wiJztcbiAgICBjaGlsZF9wcm9jZXNzXzEuZXhlYyhjbWQsIGZ1bmN0aW9uIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBleGVjIGVycm9yOiAke2Vycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApO1xuICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyOiAke3N0ZGVycn1gKTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIHN0YXJ0Q29tbWFuZExpbmUoc2NtZCkge1xuICAgIHZhciBjbWQgPSBzY21kLmNvbmNyZXRlO1xuICAgIGNoaWxkX3Byb2Nlc3NfMS5leGVjKGNtZCwgZnVuY3Rpb24gKGVycm9yLCBzdGRvdXQsIHN0ZGVycikge1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYGV4ZWMgZXJyb3I6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coYHN0ZG91dDogJHtzdGRvdXR9YCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApO1xuICAgIH0pO1xufVxuZnVuY3Rpb24gZXhwYW5kQ29udGV4dEludG9BY3Rpb24ob1Jlc3VsdCkge1xuICAgIHZhciBwYXR0ZXJuID0gb1Jlc3VsdC5hY3Rpb24ucGF0dGVybjtcbiAgICBPYmplY3Qua2V5cyhvUmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgneycgKyBzS2V5ICsgJ30nLCAnZycpO1xuICAgICAgICBwYXR0ZXJuID0gcGF0dGVybi5yZXBsYWNlKHJlZ2V4LCBvUmVzdWx0LmNvbnRleHRbc0tleV0pO1xuICAgICAgICBwYXR0ZXJuID0gcGF0dGVybi5yZXBsYWNlKHJlZ2V4LCBvUmVzdWx0LmNvbnRleHRbc0tleV0pO1xuICAgIH0pO1xuICAgIG9SZXN1bHQuYWN0aW9uLmNvbmNyZXRlID0gcGF0dGVybjtcbiAgICByZXR1cm4gcGF0dGVybjtcbn1cbmV4cG9ydHMuZXhwYW5kQ29udGV4dEludG9BY3Rpb24gPSBleHBhbmRDb250ZXh0SW50b0FjdGlvbjtcbi8qKlxuICogZXhlY3V0ZSBzb21lIHN0YXJ1cHRcbiAqXG4gKi9cbmZ1bmN0aW9uIGV4ZWN1dGVTdGFydHVwKG9SZXN1bHQsIGNiKSB7XG4gICAgaWYgKG9SZXN1bHQudHlwZSAhPT0gMSAvKiBFWEVDICovKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGFjdGlvbiA9IG9SZXN1bHQuYWN0aW9uO1xuICAgIGlmIChvUmVzdWx0LmFjdGlvbi50eXBlID09PSAwIC8qIFNUQVJUVVJMICovKSB7XG4gICAgICAgIC8vdmFyIHB0biA9IGV4cGFuZFBhcmFtZXRlcnNJblVSTChvUmVzdWx0KVxuICAgICAgICBzdGFydEJyb3dzZXIoYWN0aW9uKTtcbiAgICAgICAgcmV0dXJuIGFjdGlvbi5jb25jcmV0ZTtcbiAgICB9XG4gICAgZWxzZSBpZiAob1Jlc3VsdC5hY3Rpb24udHlwZSA9PT0gMSAvKiBTVEFSVENNRExJTkUgKi8pIHtcbiAgICAgICAgc3RhcnRDb21tYW5kTGluZShhY3Rpb24pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIHMgPSAoXCJEb24ndCBrbm93IGhvdyB0byBzdGFydCBcIiArIG9SZXN1bHQudHlwZSArICdcXG4gZm9yIFwiJyArIG9SZXN1bHQucXVlcnkgKyAnXCInKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihzKTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfVxufVxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZXhlY3V0ZVN0YXJ0dXA6IGV4ZWN1dGVTdGFydHVwXG59O1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
