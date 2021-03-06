"use strict";
/**
 * @file toolmatcher
 * @module jfseb.fdevstart.toolmatcher
 * @copyright (c) Gerd Forstmann
 *
 * Match a tool record on a sentence,
 *
 * This will unify matching required and optional category words
 * with the requirements of the tool.
 *
 */

Object.defineProperty(exports, "__esModule", { value: true });
var oToolFLPD = {
    'name': 'FLPD',
    'requires': { 'systemId': {}, 'client': {} },
    'optional': { 'fiori catalog': {}, 'fiori group': {} }
};
var oToolFLP = {
    'name': 'FLP',
    'requires': { 'systemId': {}, 'client': {} },
    "optional": {
        "fiori intent": {}
    },
    "sets": {
        "intent": {
            "set": ["systemId", "client", "fiori intent"],
            "response": "_urlpattern1"
        },
        "none": {
            "set": ["systemId", "client"],
            "response": "_urlpattern2"
        }
    }
};
var oToolTA = {
    'name': 'StartTA',
    'requires': { 'transaction': {}, 'systemId': {}, 'client': {} },
    'optional': {}
};
var oToolWiki = {
    'name': 'wiki',
    'requires': { 'wiki': {} },
    'optional': { 'wikipage': {} }
};
var oToolUnitTest = {
    'name': 'unit test',
    'requires': { 'unit test': {} },
    optional: {}
};
var tools = [oToolWiki, oToolTA, oToolUnitTest, oToolFLPD, oToolFLP];
function cmpTools(a, b) {
    return a.name.localeCompare(b.name);
}
exports.cmpTools = cmpTools;
function getTools() {
    return tools.sort(cmpTools);
}
exports.getTools = getTools;
;
function findMatchingSet(a) {}
exports.findMatchingSet = findMatchingSet;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL3Rvb2xzLmpzIiwiLi4vc3JjL21hdGNoL3Rvb2xzLnRzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwib1Rvb2xGTFBEIiwib1Rvb2xGTFAiLCJvVG9vbFRBIiwib1Rvb2xXaWtpIiwib1Rvb2xVbml0VGVzdCIsIm9wdGlvbmFsIiwidG9vbHMiLCJjbXBUb29scyIsImEiLCJiIiwibmFtZSIsImxvY2FsZUNvbXBhcmUiLCJnZXRUb29scyIsInNvcnQiLCJmaW5kTWF0Y2hpbmdTZXQiXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7Ozs7Ozs7Ozs7OztBRFlBQSxPQUFPQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QyxFQUFFQyxPQUFPLElBQVQsRUFBN0M7QUNPQSxJQUFJQyxZQUFZO0FBQ2QsWUFBUSxNQURNO0FBRWQsZ0JBQVksRUFBRSxZQUFZLEVBQWQsRUFBa0IsVUFBVSxFQUE1QixFQUZFO0FBR2QsZ0JBQVksRUFBRSxpQkFBaUIsRUFBbkIsRUFBdUIsZUFBZSxFQUF0QztBQUhFLENBQWhCO0FBTUEsSUFBSUMsV0FBVztBQUNiLFlBQVEsS0FESztBQUViLGdCQUFZLEVBQUUsWUFBWSxFQUFkLEVBQWtCLFVBQVUsRUFBNUIsRUFGQztBQUdiLGdCQUFZO0FBQ1Ysd0JBQWdCO0FBRE4sS0FIQztBQU1iLFlBQVE7QUFDTixrQkFBVTtBQUNSLG1CQUFPLENBQ0wsVUFESyxFQUVMLFFBRkssRUFHTCxjQUhLLENBREM7QUFNUix3QkFBWTtBQU5KLFNBREo7QUFTTixnQkFBUTtBQUNOLG1CQUFPLENBQ0wsVUFESyxFQUVMLFFBRkssQ0FERDtBQUtOLHdCQUFZO0FBTE47QUFURjtBQU5LLENBQWY7QUF5QkEsSUFBSUMsVUFBVTtBQUNaLFlBQVEsU0FESTtBQUVaLGdCQUFZLEVBQUUsZUFBZSxFQUFqQixFQUFxQixZQUFZLEVBQWpDLEVBQXFDLFVBQVUsRUFBL0MsRUFGQTtBQUdaLGdCQUFZO0FBSEEsQ0FBZDtBQU1BLElBQUlDLFlBQVk7QUFDZCxZQUFRLE1BRE07QUFFZCxnQkFBWSxFQUFFLFFBQVEsRUFBVixFQUZFO0FBR2QsZ0JBQVksRUFBRSxZQUFZLEVBQWQ7QUFIRSxDQUFoQjtBQU9BLElBQUlDLGdCQUFnQjtBQUNsQixZQUFRLFdBRFU7QUFFbEIsZ0JBQVksRUFBRSxhQUFhLEVBQWYsRUFGTTtBQUdsQkMsY0FBVTtBQUhRLENBQXBCO0FBT0EsSUFBTUMsUUFBUSxDQUFDSCxTQUFELEVBQVlELE9BQVosRUFBcUJFLGFBQXJCLEVBQW9DSixTQUFwQyxFQUErQ0MsUUFBL0MsQ0FBZDtBQUVBLFNBQUFNLFFBQUEsQ0FBeUJDLENBQXpCLEVBQTBDQyxDQUExQyxFQUF5RDtBQUN2RCxXQUFPRCxFQUFFRSxJQUFGLENBQU9DLGFBQVAsQ0FBcUJGLEVBQUVDLElBQXZCLENBQVA7QUFDRDtBQUZEWixRQUFBUyxRQUFBLEdBQUFBLFFBQUE7QUFJQSxTQUFBSyxRQUFBLEdBQUE7QUFDRSxXQUFPTixNQUFNTyxJQUFOLENBQVdOLFFBQVgsQ0FBUDtBQUNEO0FBRkRULFFBQUFjLFFBQUEsR0FBQUEsUUFBQTtBQUVDO0FBR0QsU0FBQUUsZUFBQSxDQUFnQ04sQ0FBaEMsRUFBNEQsQ0FFM0Q7QUFGRFYsUUFBQWdCLGVBQUEsR0FBQUEsZUFBQSIsImZpbGUiOiJtYXRjaC90b29scy5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiBAZmlsZSB0b29sbWF0Y2hlclxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQudG9vbG1hdGNoZXJcbiAqIEBjb3B5cmlnaHQgKGMpIEdlcmQgRm9yc3RtYW5uXG4gKlxuICogTWF0Y2ggYSB0b29sIHJlY29yZCBvbiBhIHNlbnRlbmNlLFxuICpcbiAqIFRoaXMgd2lsbCB1bmlmeSBtYXRjaGluZyByZXF1aXJlZCBhbmQgb3B0aW9uYWwgY2F0ZWdvcnkgd29yZHNcbiAqIHdpdGggdGhlIHJlcXVpcmVtZW50cyBvZiB0aGUgdG9vbC5cbiAqXG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciBvVG9vbEZMUEQgPSB7XG4gICAgJ25hbWUnOiAnRkxQRCcsXG4gICAgJ3JlcXVpcmVzJzogeyAnc3lzdGVtSWQnOiB7fSwgJ2NsaWVudCc6IHt9IH0sXG4gICAgJ29wdGlvbmFsJzogeyAnZmlvcmkgY2F0YWxvZyc6IHt9LCAnZmlvcmkgZ3JvdXAnOiB7fSB9XG59O1xudmFyIG9Ub29sRkxQID0ge1xuICAgICduYW1lJzogJ0ZMUCcsXG4gICAgJ3JlcXVpcmVzJzogeyAnc3lzdGVtSWQnOiB7fSwgJ2NsaWVudCc6IHt9IH0sXG4gICAgXCJvcHRpb25hbFwiOiB7XG4gICAgICAgIFwiZmlvcmkgaW50ZW50XCI6IHt9XG4gICAgfSxcbiAgICBcInNldHNcIjoge1xuICAgICAgICBcImludGVudFwiOiB7XG4gICAgICAgICAgICBcInNldFwiOiBbXG4gICAgICAgICAgICAgICAgXCJzeXN0ZW1JZFwiLFxuICAgICAgICAgICAgICAgIFwiY2xpZW50XCIsXG4gICAgICAgICAgICAgICAgXCJmaW9yaSBpbnRlbnRcIlxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIFwicmVzcG9uc2VcIjogXCJfdXJscGF0dGVybjFcIlxuICAgICAgICB9LFxuICAgICAgICBcIm5vbmVcIjoge1xuICAgICAgICAgICAgXCJzZXRcIjogW1xuICAgICAgICAgICAgICAgIFwic3lzdGVtSWRcIixcbiAgICAgICAgICAgICAgICBcImNsaWVudFwiXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgXCJyZXNwb25zZVwiOiBcIl91cmxwYXR0ZXJuMlwiXG4gICAgICAgIH1cbiAgICB9XG59O1xudmFyIG9Ub29sVEEgPSB7XG4gICAgJ25hbWUnOiAnU3RhcnRUQScsXG4gICAgJ3JlcXVpcmVzJzogeyAndHJhbnNhY3Rpb24nOiB7fSwgJ3N5c3RlbUlkJzoge30sICdjbGllbnQnOiB7fSB9LFxuICAgICdvcHRpb25hbCc6IHt9XG59O1xudmFyIG9Ub29sV2lraSA9IHtcbiAgICAnbmFtZSc6ICd3aWtpJyxcbiAgICAncmVxdWlyZXMnOiB7ICd3aWtpJzoge30gfSxcbiAgICAnb3B0aW9uYWwnOiB7ICd3aWtpcGFnZSc6IHt9IH1cbn07XG52YXIgb1Rvb2xVbml0VGVzdCA9IHtcbiAgICAnbmFtZSc6ICd1bml0IHRlc3QnLFxuICAgICdyZXF1aXJlcyc6IHsgJ3VuaXQgdGVzdCc6IHt9IH0sXG4gICAgb3B0aW9uYWw6IHt9XG59O1xuY29uc3QgdG9vbHMgPSBbb1Rvb2xXaWtpLCBvVG9vbFRBLCBvVG9vbFVuaXRUZXN0LCBvVG9vbEZMUEQsIG9Ub29sRkxQXTtcbmZ1bmN0aW9uIGNtcFRvb2xzKGEsIGIpIHtcbiAgICByZXR1cm4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKTtcbn1cbmV4cG9ydHMuY21wVG9vbHMgPSBjbXBUb29scztcbmZ1bmN0aW9uIGdldFRvb2xzKCkge1xuICAgIHJldHVybiB0b29scy5zb3J0KGNtcFRvb2xzKTtcbn1cbmV4cG9ydHMuZ2V0VG9vbHMgPSBnZXRUb29scztcbjtcbmZ1bmN0aW9uIGZpbmRNYXRjaGluZ1NldChhKSB7XG59XG5leHBvcnRzLmZpbmRNYXRjaGluZ1NldCA9IGZpbmRNYXRjaGluZ1NldDtcbiIsIi8qKlxyXG4gKiBAZmlsZSB0b29sbWF0Y2hlclxyXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC50b29sbWF0Y2hlclxyXG4gKiBAY29weXJpZ2h0IChjKSBHZXJkIEZvcnN0bWFublxyXG4gKlxyXG4gKiBNYXRjaCBhIHRvb2wgcmVjb3JkIG9uIGEgc2VudGVuY2UsXHJcbiAqXHJcbiAqIFRoaXMgd2lsbCB1bmlmeSBtYXRjaGluZyByZXF1aXJlZCBhbmQgb3B0aW9uYWwgY2F0ZWdvcnkgd29yZHNcclxuICogd2l0aCB0aGUgcmVxdWlyZW1lbnRzIG9mIHRoZSB0b29sLlxyXG4gKlxyXG4gKi9cclxuXHJcbi8vIC8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuXHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4vaWZtYXRjaCc7XHJcblxyXG5cclxuXHJcbnZhciBvVG9vbEZMUEQgPSB7XHJcbiAgJ25hbWUnOiAnRkxQRCcsXHJcbiAgJ3JlcXVpcmVzJzogeyAnc3lzdGVtSWQnOiB7fSwgJ2NsaWVudCc6IHt9IH0sXHJcbiAgJ29wdGlvbmFsJzogeyAnZmlvcmkgY2F0YWxvZyc6IHt9LCAnZmlvcmkgZ3JvdXAnOiB7fSB9XHJcbn07XHJcblxyXG52YXIgb1Rvb2xGTFAgPSB7XHJcbiAgJ25hbWUnOiAnRkxQJyxcclxuICAncmVxdWlyZXMnOiB7ICdzeXN0ZW1JZCc6IHt9LCAnY2xpZW50Jzoge30gfSxcclxuICBcIm9wdGlvbmFsXCI6IHtcclxuICAgIFwiZmlvcmkgaW50ZW50XCI6IHt9XHJcbiAgfSxcclxuICBcInNldHNcIjoge1xyXG4gICAgXCJpbnRlbnRcIjoge1xyXG4gICAgICBcInNldFwiOiBbXHJcbiAgICAgICAgXCJzeXN0ZW1JZFwiLFxyXG4gICAgICAgIFwiY2xpZW50XCIsXHJcbiAgICAgICAgXCJmaW9yaSBpbnRlbnRcIlxyXG4gICAgICBdLFxyXG4gICAgICBcInJlc3BvbnNlXCI6IFwiX3VybHBhdHRlcm4xXCJcclxuICAgIH0sXHJcbiAgICBcIm5vbmVcIjoge1xyXG4gICAgICBcInNldFwiOiBbXHJcbiAgICAgICAgXCJzeXN0ZW1JZFwiLFxyXG4gICAgICAgIFwiY2xpZW50XCJcclxuICAgICAgXSxcclxuICAgICAgXCJyZXNwb25zZVwiOiBcIl91cmxwYXR0ZXJuMlwiXHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxudmFyIG9Ub29sVEEgPSB7XHJcbiAgJ25hbWUnOiAnU3RhcnRUQScsXHJcbiAgJ3JlcXVpcmVzJzogeyAndHJhbnNhY3Rpb24nOiB7fSwgJ3N5c3RlbUlkJzoge30sICdjbGllbnQnOiB7fSB9LFxyXG4gICdvcHRpb25hbCc6IHt9XHJcbn07XHJcblxyXG52YXIgb1Rvb2xXaWtpID0ge1xyXG4gICduYW1lJzogJ3dpa2knLFxyXG4gICdyZXF1aXJlcyc6IHsgJ3dpa2knOiB7fSB9LFxyXG4gICdvcHRpb25hbCc6IHsgJ3dpa2lwYWdlJzoge30gfVxyXG59O1xyXG5cclxuXHJcbnZhciBvVG9vbFVuaXRUZXN0ID0ge1xyXG4gICduYW1lJzogJ3VuaXQgdGVzdCcsXHJcbiAgJ3JlcXVpcmVzJzogeyAndW5pdCB0ZXN0Jzoge30gfSxcclxuICBvcHRpb25hbDoge31cclxufTtcclxuXHJcblxyXG5jb25zdCB0b29scyA9IFtvVG9vbFdpa2ksIG9Ub29sVEEsIG9Ub29sVW5pdFRlc3QsIG9Ub29sRkxQRCwgb1Rvb2xGTFBdO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNtcFRvb2xzKGE6IElNYXRjaC5JVG9vbCwgYjogSU1hdGNoLklUb29sKSB7XHJcbiAgcmV0dXJuIGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRUb29scygpIHtcclxuICByZXR1cm4gdG9vbHMuc29ydChjbXBUb29scyk7XHJcbn07XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNYXRjaGluZ1NldChhIDogQXJyYXk8SU1hdGNoLklUb29sTWF0Y2g+ICkge1xyXG5cclxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
