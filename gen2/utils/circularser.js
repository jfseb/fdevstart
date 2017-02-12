/**
 * (c) gerd forstmann 2017
 */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var JSONx = require('circular-json');
var fs = require("fs");
var debug = require("debug");
var zlib = require("zlib");
var debuglog = debug('circularser');
function zipData(data) {
    var r = zlib.deflateSync(Buffer.from(data, 'utf-8'));
    console.log("here r" + (typeof r === 'undefined' ? 'undefined' : _typeof(r)));
    var k = zlib.inflateSync(r);
    return r;
}
function unzipData(data) {
    return zlib.inflateSync(data).toString();
}
/* this from http://stackoverflow.com/questions/12075927/serialization-of-regexp */
function replacer(key, value) {
    if (value instanceof RegExp) return "__REGEXP " + value.toString();else return value;
}
function reviver(key, value) {
    if (value && value.toString().indexOf("__REGEXP ") == 0) {
        var m = value.split("__REGEXP ")[1].match(/\/(.*)\/(.*)?/);
        return new RegExp(m[1], m[2] || "");
    } else return value;
}
//console.logJSON.parse(JSON.stringify(obj, replacer, 2), reviver));
function stringify(obj) {
    var s = JSONx.stringify(obj, replacer);
    return s;
}
exports.stringify = stringify;
function parse(s) {
    var obj;
    try {
        obj = JSONx.parse(s, reviver);
    } catch (e) {
        //console.log("here e" + e);
        return undefined;
    }
    return obj;
}
exports.parse = parse;
function save(fn, obj) {
    var s = stringify(obj);
    var u = zipData(s);
    fs.writeFileSync(fn + ".zip", u, 'binary'); // { encoding : 'utf-8'});
}
exports.save = save;
function load(fn) {
    var obj;
    try {
        debuglog("read file " + fn);
        var d = fs.readFileSync(fn + ".zip", 'binary'); // utf-8'); //utf-8');
        debuglog("start unzip : " + (typeof d === 'undefined' ? 'undefined' : _typeof(d)) + " length ? " + ('' + d).length);
        var s = '' + unzipData(d);
        debuglog('loaded file' + s.length);
        debuglog("end unzip");
        obj = parse(s);
        debuglog("end parse");
    } catch (e) {
        debuglog('here e :' + e);
        return undefined;
    }
    return obj;
}
exports.load = load;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9jaXJjdWxhcnNlci50cyJdLCJuYW1lcyI6WyJKU09OeCIsInJlcXVpcmUiLCJmcyIsImRlYnVnIiwiemxpYiIsImRlYnVnbG9nIiwiemlwRGF0YSIsImRhdGEiLCJyIiwiZGVmbGF0ZVN5bmMiLCJCdWZmZXIiLCJmcm9tIiwiY29uc29sZSIsImxvZyIsImsiLCJpbmZsYXRlU3luYyIsInVuemlwRGF0YSIsInRvU3RyaW5nIiwicmVwbGFjZXIiLCJrZXkiLCJ2YWx1ZSIsIlJlZ0V4cCIsInJldml2ZXIiLCJpbmRleE9mIiwibSIsInNwbGl0IiwibWF0Y2giLCJzdHJpbmdpZnkiLCJvYmoiLCJzIiwiZXhwb3J0cyIsInBhcnNlIiwiZSIsInVuZGVmaW5lZCIsInNhdmUiLCJmbiIsInUiLCJ3cml0ZUZpbGVTeW5jIiwibG9hZCIsImQiLCJyZWFkRmlsZVN5bmMiLCJsZW5ndGgiXSwibWFwcGluZ3MiOiJBQUFBOzs7QUFHQTs7OztBQUVBLElBQUlBLFFBQVFDLFFBQVEsZUFBUixDQUFaO0FBRUEsSUFBQUMsS0FBQUQsUUFBQSxJQUFBLENBQUE7QUFDQSxJQUFBRSxRQUFBRixRQUFBLE9BQUEsQ0FBQTtBQUVBLElBQUFHLE9BQUFILFFBQUEsTUFBQSxDQUFBO0FBRUEsSUFBTUksV0FBV0YsTUFBTSxhQUFOLENBQWpCO0FBR0EsU0FBQUcsT0FBQSxDQUFpQkMsSUFBakIsRUFBOEI7QUFDMUIsUUFBSUMsSUFBSUosS0FBS0ssV0FBTCxDQUFpQkMsT0FBT0MsSUFBUCxDQUFZSixJQUFaLEVBQWlCLE9BQWpCLENBQWpCLENBQVI7QUFDQUssWUFBUUMsR0FBUixDQUFZLG1CQUFrQkwsQ0FBbEIseUNBQWtCQSxDQUFsQixFQUFaO0FBQ0EsUUFBSU0sSUFBSVYsS0FBS1csV0FBTCxDQUFpQlAsQ0FBakIsQ0FBUjtBQUNBLFdBQU9BLENBQVA7QUFDSDtBQUVELFNBQUFRLFNBQUEsQ0FBbUJULElBQW5CLEVBQTZCO0FBQ3pCLFdBQU9ILEtBQUtXLFdBQUwsQ0FBaUJSLElBQWpCLEVBQXVCVSxRQUF2QixFQUFQO0FBQ0g7QUFFRDtBQUNBLFNBQUFDLFFBQUEsQ0FBa0JDLEdBQWxCLEVBQXVCQyxLQUF2QixFQUE0QjtBQUMxQixRQUFJQSxpQkFBaUJDLE1BQXJCLEVBQ0UsT0FBUSxjQUFjRCxNQUFNSCxRQUFOLEVBQXRCLENBREYsS0FHRSxPQUFPRyxLQUFQO0FBQ0g7QUFFRCxTQUFBRSxPQUFBLENBQWlCSCxHQUFqQixFQUFzQkMsS0FBdEIsRUFBMkI7QUFDekIsUUFBSUEsU0FBU0EsTUFBTUgsUUFBTixHQUFpQk0sT0FBakIsQ0FBeUIsV0FBekIsS0FBeUMsQ0FBdEQsRUFBeUQ7QUFDdkQsWUFBSUMsSUFBSUosTUFBTUssS0FBTixDQUFZLFdBQVosRUFBeUIsQ0FBekIsRUFBNEJDLEtBQTVCLENBQWtDLGVBQWxDLENBQVI7QUFDQSxlQUFPLElBQUlMLE1BQUosQ0FBV0csRUFBRSxDQUFGLENBQVgsRUFBaUJBLEVBQUUsQ0FBRixLQUFRLEVBQXpCLENBQVA7QUFDRCxLQUhELE1BSUUsT0FBT0osS0FBUDtBQUNIO0FBRUQ7QUFFQSxTQUFBTyxTQUFBLENBQTBCQyxHQUExQixFQUFrQztBQUM5QixRQUFJQyxJQUFJN0IsTUFBTTJCLFNBQU4sQ0FBZ0JDLEdBQWhCLEVBQXFCVixRQUFyQixDQUFSO0FBQ0EsV0FBT1csQ0FBUDtBQUNIO0FBSERDLFFBQUFILFNBQUEsR0FBQUEsU0FBQTtBQUtBLFNBQUFJLEtBQUEsQ0FBc0JGLENBQXRCLEVBQStCO0FBQzNCLFFBQUlELEdBQUo7QUFDQSxRQUFJO0FBQ0FBLGNBQU01QixNQUFNK0IsS0FBTixDQUFZRixDQUFaLEVBQWVQLE9BQWYsQ0FBTjtBQUNILEtBRkQsQ0FFRSxPQUFPVSxDQUFQLEVBQVU7QUFDUjtBQUNBLGVBQU9DLFNBQVA7QUFDSDtBQUNELFdBQU9MLEdBQVA7QUFDSDtBQVRERSxRQUFBQyxLQUFBLEdBQUFBLEtBQUE7QUFXQSxTQUFBRyxJQUFBLENBQXFCQyxFQUFyQixFQUFrQ1AsR0FBbEMsRUFBMEM7QUFDdEMsUUFBSUMsSUFBSUYsVUFBVUMsR0FBVixDQUFSO0FBRUEsUUFBSVEsSUFBSTlCLFFBQVF1QixDQUFSLENBQVI7QUFDQTNCLE9BQUdtQyxhQUFILENBQWlCRixLQUFLLE1BQXRCLEVBQThCQyxDQUE5QixFQUFrQyxRQUFsQyxFQUpzQyxDQUlPO0FBQ2hEO0FBTEROLFFBQUFJLElBQUEsR0FBQUEsSUFBQTtBQU9BLFNBQUFJLElBQUEsQ0FBcUJILEVBQXJCLEVBQStCO0FBQzNCLFFBQUlQLEdBQUo7QUFDQSxRQUFJO0FBQ0F2QixpQkFBUyxlQUFlOEIsRUFBeEI7QUFDQSxZQUFJSSxJQUFLckMsR0FBR3NDLFlBQUgsQ0FBZ0JMLEtBQUssTUFBckIsRUFBNkIsUUFBN0IsQ0FBVCxDQUZBLENBRWlEO0FBQ2pEOUIsaUJBQVMsMkJBQTJCa0MsQ0FBM0IseUNBQTJCQSxDQUEzQixLQUFnQyxZQUFoQyxHQUErQyxDQUFDLEtBQUtBLENBQU4sRUFBU0UsTUFBakU7QUFDQSxZQUFJWixJQUFJLEtBQUtiLFVBQVV1QixDQUFWLENBQWI7QUFDQWxDLGlCQUFTLGdCQUFnQndCLEVBQUVZLE1BQTNCO0FBQ0FwQyxpQkFBUyxXQUFUO0FBQ0F1QixjQUFNRyxNQUFNRixDQUFOLENBQU47QUFDQXhCLGlCQUFTLFdBQVQ7QUFDSCxLQVRELENBU0UsT0FBTzJCLENBQVAsRUFBVTtBQUNSM0IsaUJBQVMsYUFBWTJCLENBQXJCO0FBQ0EsZUFBT0MsU0FBUDtBQUNIO0FBQ0QsV0FBT0wsR0FBUDtBQUNIO0FBaEJERSxRQUFBUSxJQUFBLEdBQUFBLElBQUEiLCJmaWxlIjoidXRpbHMvY2lyY3VsYXJzZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIChjKSBnZXJkIGZvcnN0bWFubiAyMDE3XG4gKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIEpTT054ID0gcmVxdWlyZSgnY2lyY3VsYXItanNvbicpO1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5cbmltcG9ydCAqIGFzIHpsaWIgZnJvbSAnemxpYic7XG5cbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2NpcmN1bGFyc2VyJyk7XG5cblxuZnVuY3Rpb24gemlwRGF0YShkYXRhIDogc3RyaW5nKSAgOiBhbnkge1xuICAgIHZhciByID0gemxpYi5kZWZsYXRlU3luYyhCdWZmZXIuZnJvbShkYXRhLCd1dGYtOCcpKTtcbiAgICBjb25zb2xlLmxvZyhcImhlcmUgclwiICsgdHlwZW9mIHIpO1xuICAgIHZhciBrID0gemxpYi5pbmZsYXRlU3luYyhyKTtcbiAgICByZXR1cm4gcjtcbn1cblxuZnVuY3Rpb24gdW56aXBEYXRhKGRhdGEgOiBhbnkpIDogc3RyaW5nIHtcbiAgICByZXR1cm4gemxpYi5pbmZsYXRlU3luYyhkYXRhKS50b1N0cmluZygpO1xufVxuXG4vKiB0aGlzIGZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMjA3NTkyNy9zZXJpYWxpemF0aW9uLW9mLXJlZ2V4cCAqL1xuZnVuY3Rpb24gcmVwbGFjZXIoa2V5LCB2YWx1ZSkge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApXG4gICAgcmV0dXJuIChcIl9fUkVHRVhQIFwiICsgdmFsdWUudG9TdHJpbmcoKSk7XG4gIGVsc2VcbiAgICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIHJldml2ZXIoa2V5LCB2YWx1ZSkge1xuICBpZiAodmFsdWUgJiYgdmFsdWUudG9TdHJpbmcoKS5pbmRleE9mKFwiX19SRUdFWFAgXCIpID09IDApIHtcbiAgICB2YXIgbSA9IHZhbHVlLnNwbGl0KFwiX19SRUdFWFAgXCIpWzFdLm1hdGNoKC9cXC8oLiopXFwvKC4qKT8vKTtcbiAgICByZXR1cm4gbmV3IFJlZ0V4cChtWzFdLCBtWzJdIHx8IFwiXCIpO1xuICB9IGVsc2VcbiAgICByZXR1cm4gdmFsdWU7XG59XG5cbi8vY29uc29sZS5sb2dKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9iaiwgcmVwbGFjZXIsIDIpLCByZXZpdmVyKSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnkob2JqOiBhbnkpIDogc3RyaW5nIHtcbiAgICB2YXIgcyA9IEpTT054LnN0cmluZ2lmeShvYmosIHJlcGxhY2VyKTtcbiAgICByZXR1cm4gcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHM6IHN0cmluZykgOiBhbnkge1xuICAgIHZhciBvYmo7XG4gICAgdHJ5IHtcbiAgICAgICAgb2JqID0gSlNPTngucGFyc2UocywgcmV2aXZlcik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiaGVyZSBlXCIgKyBlKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmUoZm4gOiBzdHJpbmcsIG9iajogYW55KSA6IHZvaWQge1xuICAgIHZhciBzID0gc3RyaW5naWZ5KG9iaik7XG5cbiAgICB2YXIgdSA9IHppcERhdGEocyk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhmbiArIFwiLnppcFwiLCB1LCAgJ2JpbmFyeScpOyAvLyB7IGVuY29kaW5nIDogJ3V0Zi04J30pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbG9hZChmbjogc3RyaW5nKSB7XG4gICAgdmFyIG9iajtcbiAgICB0cnkge1xuICAgICAgICBkZWJ1Z2xvZyhcInJlYWQgZmlsZSBcIiArIGZuKTtcbiAgICAgICAgdmFyIGQgPSAgZnMucmVhZEZpbGVTeW5jKGZuICsgXCIuemlwXCIsICdiaW5hcnknKTsgLy8gdXRmLTgnKTsgLy91dGYtOCcpO1xuICAgICAgICBkZWJ1Z2xvZyhcInN0YXJ0IHVuemlwIDogXCIgKyAodHlwZW9mIGQpICsgXCIgbGVuZ3RoID8gXCIgKyAoJycgKyBkKS5sZW5ndGggKTtcbiAgICAgICAgdmFyIHMgPSAnJyArIHVuemlwRGF0YShkKTtcbiAgICAgICAgZGVidWdsb2coJ2xvYWRlZCBmaWxlJyArIHMubGVuZ3RoKTtcbiAgICAgICAgZGVidWdsb2coXCJlbmQgdW56aXBcIik7XG4gICAgICAgIG9iaiA9IHBhcnNlKHMpO1xuICAgICAgICBkZWJ1Z2xvZyhcImVuZCBwYXJzZVwiKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGRlYnVnbG9nKCdoZXJlIGUgOicgK2UpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
