/**
 * visualize a model and calculate some statistics
 */
"use strict";

var fs = require('fs');
var Model = require('./model');
var _ = require('lodash');
;
function calcCategoryRecord(m, category, domain) {
    var otherdomains = Model.getDomainsForCategory(m, category);
    _.pull(otherdomains, domain);
    var res = {
        otherdomains: otherdomains,
        nrDistinctValues: 0,
        nrDistinctValuesInDomain: 0,
        nrRecords: 0,
        nrRecordsInDomain: 0
    };
    var values = [];
    var valuesInDomain = [];
    var nrRecordsInDomain = 0;
    var distinctValues = m.records.forEach(function (oEntry) {
        if (oEntry[category]) {
            var value = oEntry[category];
            if (oEntry._domain === domain) {
                valuesInDomain[value] = (valuesInDomain[value] || 0) + 1;
                res.nrRecordsInDomain += 1;
            }
            values[value] = (values[value] || 0) + 1;
            res.nrRecords += 1;
        }
    });
    res.nrDistinctValues = Object.keys(values).length;
    res.nrDistinctValuesInDomain = Object.keys(valuesInDomain).length;
    return res;
}
exports.calcCategoryRecord = calcCategoryRecord;
function graphDomain(domain, m) {
    // draw a model domains
    var res = "\n    digraph sdsu {\n\tsize=\"36,36\";\n   rankdir=LR\n\tnode [color=yellow, style=filled];\n    \"" + domain + "\"\n  ";
    // add all category nodes
    res += "node [shape=record, color=yellow, style=filled];\n ";
    var cats = Model.getCategoriesForDomain(m, domain);
    var categoryResults = {};
    var otherdomains = [];
    cats.forEach(function (cat) {
        var catResult = calcCategoryRecord(m, cat, domain);
        categoryResults[cat] = catResult;
        otherdomains = _.union(otherdomains, categoryResults[cat].otherDomains);
        res += "\"" + cat + "\" [label=\"{ " + cat + " | " + catResult.nrDistinctValuesInDomain + " Values in " + catResult.nrRecordsInDomain + " ";
        if (catResult.nrRecordsInDomain !== catResult.nrRecords) {
            res += "|  " + (catResult.nrDistinctValues - catResult.nrDistinctValuesInDomain) + " other values in " + (catResult.nrRecords - catResult.nrRecordsInDomain) + " other records";
        } else {
            res += " ";
        }
        res += "}\"]\n";
    });
    // calculate other domains.
    // draw "other categories"
    res += "node [color=purple, style=filled]; \n";
    otherdomains.forEach(function (otherdomain) {
        res += "\"" + otherdomain + "\" \n";
    });
    // count records in domain :
    var nrRecords = m.records.reduce(function (prev, entry) {
        return prev + (entry._domain === domain ? 1 : 0);
    }, 0);
    res += "node [shape=record]; \n";
    res += " \"record\" [label=\"{<f0> " + domain + " | " + nrRecords + "}\"] \n";
    res += " \"r_other\" [label=\"{<f0> other | " + nrRecords + "}\"] \n ";
    res += "# relation from categories to domain\n";
    cats.forEach(function (cat) {
        res += " \"" + cat + "\" -> \"" + domain + "\" \n";
    });
    res += "# relation from categories to records\n";
    cats.forEach(function (cat) {
        var rec = categoryResults[cat];
        res += " \"" + cat + "\" -> \"record\" \n";
    });
    //other domains to this
    cats.forEach(function (cat) {});
    /*
    cats fo
      digraph sdsu {
      size="36,36";
      node [color=yellow, style=filled];
      FLPD FLP "BOM Editor", "WIKIURL" "UI5 Documentation", "UI5 Example", "STARTTA"
      BCP
      node [color=grey, style=filled];
      node [fontname="Verdana", size="30,30"];
      node [color=grey, style=filled];
      graph [ fontname = "Arial",
    */
    res += "}\n";
    return res;
}
exports.graphDomain = graphDomain;
var child_process_1 = require('child_process');
function execCmd(cmd) {
    child_process_1.exec(cmd, function (error, stdout, stderr) {
        if (error) {
            console.error("exec error: " + error);
            return;
        }
        console.log("stdout: " + stdout);
        console.log("stderr: " + stderr);
    });
}
;
function visModels(m, folderOut) {
    m.domains.forEach(function (sDomain) {
        var s = graphDomain(sDomain, m);
        var fnGraph = folderOut + "/" + sDomain + ".gv";
        fs.writeFileSync(fnGraph, s);
        if (process.env.GRAPHVIZ) {
            execCmd(process.env.GRAPHVIZ + " -Tjpeg -O " + fnGraph);
        }
    });
}
exports.visModels = visModels;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tb2RlbC92aXNtb2RlbC50cyIsIm1vZGVsL3Zpc21vZGVsLmpzIl0sIm5hbWVzIjpbImZzIiwicmVxdWlyZSIsIk1vZGVsIiwiXyIsImNhbGNDYXRlZ29yeVJlY29yZCIsIm0iLCJjYXRlZ29yeSIsImRvbWFpbiIsIm90aGVyZG9tYWlucyIsImdldERvbWFpbnNGb3JDYXRlZ29yeSIsInB1bGwiLCJyZXMiLCJuckRpc3RpbmN0VmFsdWVzIiwibnJEaXN0aW5jdFZhbHVlc0luRG9tYWluIiwibnJSZWNvcmRzIiwibnJSZWNvcmRzSW5Eb21haW4iLCJ2YWx1ZXMiLCJ2YWx1ZXNJbkRvbWFpbiIsImRpc3RpbmN0VmFsdWVzIiwicmVjb3JkcyIsImZvckVhY2giLCJvRW50cnkiLCJ2YWx1ZSIsIl9kb21haW4iLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwiZXhwb3J0cyIsImdyYXBoRG9tYWluIiwiY2F0cyIsImdldENhdGVnb3JpZXNGb3JEb21haW4iLCJjYXRlZ29yeVJlc3VsdHMiLCJjYXQiLCJjYXRSZXN1bHQiLCJ1bmlvbiIsIm90aGVyRG9tYWlucyIsIm90aGVyZG9tYWluIiwicmVkdWNlIiwicHJldiIsImVudHJ5IiwicmVjIiwiY2hpbGRfcHJvY2Vzc18xIiwiZXhlY0NtZCIsImNtZCIsImV4ZWMiLCJlcnJvciIsInN0ZG91dCIsInN0ZGVyciIsImNvbnNvbGUiLCJsb2ciLCJ2aXNNb2RlbHMiLCJmb2xkZXJPdXQiLCJkb21haW5zIiwic0RvbWFpbiIsInMiLCJmbkdyYXBoIiwid3JpdGVGaWxlU3luYyIsInByb2Nlc3MiLCJlbnYiLCJHUkFQSFZJWiJdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0dBOztBRE1BLElBQVlBLEtBQUVDLFFBQU0sSUFBTixDQUFkO0FBRUEsSUFBWUMsUUFBS0QsUUFBTSxTQUFOLENBQWpCO0FBRUEsSUFBWUUsSUFBQ0YsUUFBTSxRQUFOLENBQWI7QUFRRztBQUVILFNBQUFHLGtCQUFBLENBQW1DQyxDQUFuQyxFQUF1REMsUUFBdkQsRUFBMEVDLE1BQTFFLEVBQXlGO0FBRXZGLFFBQUlDLGVBQWVOLE1BQU1PLHFCQUFOLENBQTRCSixDQUE1QixFQUE4QkMsUUFBOUIsQ0FBbkI7QUFDQ0gsTUFBRU8sSUFBRixDQUFPRixZQUFQLEVBQXFCRCxNQUFyQjtBQUNBLFFBQUlJLE1BQU07QUFDVEgsc0JBQWVBLFlBRE47QUFFVEksMEJBQW1CLENBRlY7QUFHVEMsa0NBQTJCLENBSGxCO0FBSVRDLG1CQUFZLENBSkg7QUFLVEMsMkJBQW1CO0FBTFYsS0FBVjtBQVFBLFFBQUlDLFNBQVMsRUFBYjtBQUNBLFFBQUlDLGlCQUFpQixFQUFyQjtBQUNBLFFBQUlGLG9CQUFvQixDQUF4QjtBQUNBLFFBQUlHLGlCQUFpQmIsRUFBRWMsT0FBRixDQUFVQyxPQUFWLENBQWtCLFVBQVNDLE1BQVQsRUFBZTtBQUNwRCxZQUFJQSxPQUFPZixRQUFQLENBQUosRUFBc0I7QUFDcEIsZ0JBQUlnQixRQUFRRCxPQUFPZixRQUFQLENBQVo7QUFDQSxnQkFBR2UsT0FBT0UsT0FBUCxLQUFtQmhCLE1BQXRCLEVBQThCO0FBQzVCVSwrQkFBZUssS0FBZixJQUF3QixDQUFDTCxlQUFlSyxLQUFmLEtBQXlCLENBQTFCLElBQStCLENBQXZEO0FBQ0FYLG9CQUFJSSxpQkFBSixJQUF5QixDQUF6QjtBQUNEO0FBQ0ZDLG1CQUFPTSxLQUFQLElBQWdCLENBQUNOLE9BQU9NLEtBQVAsS0FBaUIsQ0FBbEIsSUFBdUIsQ0FBdkM7QUFDQ1gsZ0JBQUlHLFNBQUosSUFBaUIsQ0FBakI7QUFDRDtBQUNGLEtBVm9CLENBQXJCO0FBV0FILFFBQUlDLGdCQUFKLEdBQXVCWSxPQUFPQyxJQUFQLENBQVlULE1BQVosRUFBb0JVLE1BQTNDO0FBQ0FmLFFBQUlFLHdCQUFKLEdBQStCVyxPQUFPQyxJQUFQLENBQVlSLGNBQVosRUFBNEJTLE1BQTNEO0FBQ0EsV0FBT2YsR0FBUDtBQUNGO0FBN0JlZ0IsUUFBQXZCLGtCQUFBLEdBQWtCQSxrQkFBbEI7QUErQmhCLFNBQUF3QixXQUFBLENBQTRCckIsTUFBNUIsRUFBNkNGLENBQTdDLEVBQStEO0FBQzdEO0FBQ0EsUUFBSU0sTUFBTSx5R0FLTEosTUFMSyxHQUtDLFFBTFg7QUFPQTtBQUNBSSxXQUFPLHFEQUFQO0FBQ0EsUUFBSWtCLE9BQU8zQixNQUFNNEIsc0JBQU4sQ0FBNkJ6QixDQUE3QixFQUErQkUsTUFBL0IsQ0FBWDtBQUVBLFFBQUl3QixrQkFBa0IsRUFBdEI7QUFDQSxRQUFJdkIsZUFBZSxFQUFuQjtBQUNBcUIsU0FBS1QsT0FBTCxDQUFhLFVBQVNZLEdBQVQsRUFBWTtBQUN2QixZQUFJQyxZQUFZN0IsbUJBQW1CQyxDQUFuQixFQUFzQjJCLEdBQXRCLEVBQTJCekIsTUFBM0IsQ0FBaEI7QUFDQXdCLHdCQUFnQkMsR0FBaEIsSUFBdUJDLFNBQXZCO0FBQ0F6Qix1QkFBZUwsRUFBRStCLEtBQUYsQ0FBUTFCLFlBQVIsRUFBc0J1QixnQkFBZ0JDLEdBQWhCLEVBQXFCRyxZQUEzQyxDQUFmO0FBQ0F4QixlQUFPLE9BQUlxQixHQUFKLEdBQU8sZ0JBQVAsR0FBc0JBLEdBQXRCLEdBQXlCLEtBQXpCLEdBQStCQyxVQUFVcEIsd0JBQXpDLEdBQWlFLGFBQWpFLEdBQStFb0IsVUFBVWxCLGlCQUF6RixHQUEwRyxHQUFqSDtBQUNBLFlBQUdrQixVQUFVbEIsaUJBQVYsS0FBZ0NrQixVQUFVbkIsU0FBN0MsRUFBd0Q7QUFDdERILG1CQUFRLFNBQU1zQixVQUFVckIsZ0JBQVYsR0FBNkJxQixVQUFVcEIsd0JBQTdDLElBQXFFLG1CQUFyRSxJQUF5Rm9CLFVBQVVuQixTQUFWLEdBQXNCbUIsVUFBVWxCLGlCQUF6SCxJQUEwSSxnQkFBbEo7QUFDRCxTQUZELE1BRU87QUFDTEosbUJBQU8sR0FBUDtBQUNEO0FBQ0RBLGVBQU8sUUFBUDtBQUNELEtBWEQ7QUFhQTtBQUNBO0FBQ0FBLFdBQU8sdUNBQVA7QUFDQUgsaUJBQWFZLE9BQWIsQ0FBcUIsVUFBU2dCLFdBQVQsRUFBb0I7QUFDdkN6QixlQUFPLE9BQUl5QixXQUFKLEdBQWUsT0FBdEI7QUFDRCxLQUZEO0FBR0E7QUFDQSxRQUFJdEIsWUFBWVQsRUFBRWMsT0FBRixDQUFVa0IsTUFBVixDQUFpQixVQUFTQyxJQUFULEVBQWNDLEtBQWQsRUFBbUI7QUFDcEQsZUFBT0QsUUFBU0MsTUFBTWhCLE9BQU4sS0FBa0JoQixNQUFuQixHQUE2QixDQUE3QixHQUFpQyxDQUF6QyxDQUFQO0FBQ0MsS0FGZSxFQUVkLENBRmMsQ0FBaEI7QUFHQUksV0FBTyx5QkFBUDtBQUNBQSxXQUFPLGdDQUEyQkosTUFBM0IsR0FBaUMsS0FBakMsR0FBdUNPLFNBQXZDLEdBQWdELFNBQXZEO0FBRUFILFdBQU8seUNBQW9DRyxTQUFwQyxHQUE2QyxVQUFwRDtBQUVBSCxXQUFPLHdDQUFQO0FBQ0FrQixTQUFLVCxPQUFMLENBQWEsVUFBU1ksR0FBVCxFQUFZO0FBQ3ZCckIsZUFBTyxRQUFLcUIsR0FBTCxHQUFRLFVBQVIsR0FBaUJ6QixNQUFqQixHQUF1QixPQUE5QjtBQUNELEtBRkQ7QUFLQUksV0FBTyx5Q0FBUDtBQUNBa0IsU0FBS1QsT0FBTCxDQUFhLFVBQVNZLEdBQVQsRUFBWTtBQUN2QixZQUFJUSxNQUFNVCxnQkFBZ0JDLEdBQWhCLENBQVY7QUFDQXJCLGVBQU8sUUFBS3FCLEdBQUwsR0FBUSxxQkFBZjtBQUNELEtBSEQ7QUFNQTtBQUNBSCxTQUFLVCxPQUFMLENBQWEsVUFBU1ksR0FBVCxFQUFZLENBR3hCLENBSEQ7QUFLQTs7Ozs7Ozs7Ozs7O0FBWUFyQixXQUFPLEtBQVA7QUFDQSxXQUFPQSxHQUFQO0FBQ0Q7QUE1RWVnQixRQUFBQyxXQUFBLEdBQVdBLFdBQVg7QUE4RWhCLElBQUFhLGtCQUFBeEMsUUFBcUIsZUFBckIsQ0FBQTtBQUdBLFNBQUF5QyxPQUFBLENBQWlCQyxHQUFqQixFQUE2QjtBQUM1QkYsb0JBQUFHLElBQUEsQ0FBS0QsR0FBTCxFQUFVLFVBQVVFLEtBQVYsRUFBaUJDLE1BQWpCLEVBQXlCQyxNQUF6QixFQUErQjtBQUN0QyxZQUFJRixLQUFKLEVBQVc7QUFDVEcsb0JBQVFILEtBQVIsQ0FBYyxpQkFBZUEsS0FBN0I7QUFDQTtBQUNEO0FBQ0RHLGdCQUFRQyxHQUFSLENBQVksYUFBV0gsTUFBdkI7QUFDQUUsZ0JBQVFDLEdBQVIsQ0FBWSxhQUFXRixNQUF2QjtBQUNELEtBUEY7QUFRQTtBQUFBO0FBRUQsU0FBQUcsU0FBQSxDQUEwQjdDLENBQTFCLEVBQThDOEMsU0FBOUMsRUFBZ0U7QUFDOUQ5QyxNQUFFK0MsT0FBRixDQUFVaEMsT0FBVixDQUFrQixVQUFTaUMsT0FBVCxFQUFnQjtBQUNoQyxZQUFJQyxJQUFJMUIsWUFBWXlCLE9BQVosRUFBb0JoRCxDQUFwQixDQUFSO0FBQ0EsWUFBSWtELFVBQVVKLFlBQVksR0FBWixHQUFrQkUsT0FBbEIsR0FBNEIsS0FBMUM7QUFDQXJELFdBQUd3RCxhQUFILENBQWlCRCxPQUFqQixFQUEwQkQsQ0FBMUI7QUFDQSxZQUFHRyxRQUFRQyxHQUFSLENBQVlDLFFBQWYsRUFBeUI7QUFDdkJqQixvQkFBUWUsUUFBUUMsR0FBUixDQUFZQyxRQUFaLEdBQXVCLGFBQXZCLEdBQXVDSixPQUEvQztBQUNEO0FBQ0YsS0FQRDtBQVFEO0FBVGU1QixRQUFBdUIsU0FBQSxHQUFTQSxTQUFUIiwiZmlsZSI6Im1vZGVsL3Zpc21vZGVsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiB2aXN1YWxpemUgYSBtb2RlbCBhbmQgY2FsY3VsYXRlIHNvbWUgc3RhdGlzdGljc1xuICovXG5cblxuXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvaWZtYXRjaCc7XG5cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuXG5pbXBvcnQgKiBhcyBNb2RlbCBmcm9tICcuL21vZGVsJztcblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG5pbnRlcmZhY2UgQ2F0ZWdvcnlSZWNvcmQge1xuICAgIG90aGVyZG9tYWlucyA6IHN0cmluZ1tdLFxuICAgIG5yRGlzdGluY3RWYWx1ZXMgOiBudW1iZXIsXG4gICAgbnJEaXN0aW5jdFZhbHVlc0luRG9tYWluIDogbnVtYmVyLFxuICAgIG5yUmVjb3JkcyA6IG51bWJlcixcbiAgICBuclJlY29yZHNJbkRvbWFpbjogbnVtYmVyXG4gIH07XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjQ2F0ZWdvcnlSZWNvcmQobSA6IElNYXRjaC5JTW9kZWxzLCBjYXRlZ29yeSA6IHN0cmluZywgZG9tYWluIDogc3RyaW5nKSAgOiBDYXRlZ29yeVJlY29yZCB7XG5cbiAgdmFyIG90aGVyZG9tYWlucyA9IE1vZGVsLmdldERvbWFpbnNGb3JDYXRlZ29yeShtLGNhdGVnb3J5KTtcbiAgIF8ucHVsbChvdGhlcmRvbWFpbnMsIGRvbWFpbik7XG4gICB2YXIgcmVzID0ge1xuICAgIG90aGVyZG9tYWlucyA6IG90aGVyZG9tYWlucyxcbiAgICBuckRpc3RpbmN0VmFsdWVzIDogMCxcbiAgICBuckRpc3RpbmN0VmFsdWVzSW5Eb21haW4gOiAwLFxuICAgIG5yUmVjb3JkcyA6IDAsXG4gICAgbnJSZWNvcmRzSW5Eb21haW46IDBcbiAgfSBhcyBDYXRlZ29yeVJlY29yZDtcblxuICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgdmFyIHZhbHVlc0luRG9tYWluID0gW107XG4gICB2YXIgbnJSZWNvcmRzSW5Eb21haW4gPSAwO1xuICAgdmFyIGRpc3RpbmN0VmFsdWVzID0gbS5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24ob0VudHJ5KSB7XG4gICAgIGlmIChvRW50cnlbY2F0ZWdvcnldKSB7XG4gICAgICAgdmFyIHZhbHVlID0gb0VudHJ5W2NhdGVnb3J5XTtcbiAgICAgICBpZihvRW50cnkuX2RvbWFpbiA9PT0gZG9tYWluKSB7XG4gICAgICAgICB2YWx1ZXNJbkRvbWFpblt2YWx1ZV0gPSAodmFsdWVzSW5Eb21haW5bdmFsdWVdIHx8IDApICsgMTtcbiAgICAgICAgIHJlcy5uclJlY29yZHNJbkRvbWFpbiArPSAxO1xuICAgICAgIH1cbiAgICAgIHZhbHVlc1t2YWx1ZV0gPSAodmFsdWVzW3ZhbHVlXSB8fCAwKSArIDE7XG4gICAgICAgcmVzLm5yUmVjb3JkcyArPSAxO1xuICAgICB9XG4gICB9KTtcbiAgIHJlcy5uckRpc3RpbmN0VmFsdWVzID0gT2JqZWN0LmtleXModmFsdWVzKS5sZW5ndGg7XG4gICByZXMubnJEaXN0aW5jdFZhbHVlc0luRG9tYWluID0gT2JqZWN0LmtleXModmFsdWVzSW5Eb21haW4pLmxlbmd0aDtcbiAgIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBncmFwaERvbWFpbihkb21haW4gOiBzdHJpbmcsIG0gOiBJTWF0Y2guSU1vZGVscykge1xuICAvLyBkcmF3IGEgbW9kZWwgZG9tYWluc1xuICB2YXIgcmVzID0gYFxuICAgIGRpZ3JhcGggc2RzdSB7XG5cdHNpemU9XCIzNiwzNlwiO1xuICAgcmFua2Rpcj1MUlxuXHRub2RlIFtjb2xvcj15ZWxsb3csIHN0eWxlPWZpbGxlZF07XG4gICAgXCIke2RvbWFpbn1cIlxuICBgO1xuICAvLyBhZGQgYWxsIGNhdGVnb3J5IG5vZGVzXG4gIHJlcyArPSBgbm9kZSBbc2hhcGU9cmVjb3JkLCBjb2xvcj15ZWxsb3csIHN0eWxlPWZpbGxlZF07XFxuIGBcbiAgdmFyIGNhdHMgPSBNb2RlbC5nZXRDYXRlZ29yaWVzRm9yRG9tYWluKG0sZG9tYWluKTtcblxuICB2YXIgY2F0ZWdvcnlSZXN1bHRzID0ge307XG4gIHZhciBvdGhlcmRvbWFpbnMgPSBbXTtcbiAgY2F0cy5mb3JFYWNoKGZ1bmN0aW9uKGNhdCkge1xuICAgIHZhciBjYXRSZXN1bHQgPSBjYWxjQ2F0ZWdvcnlSZWNvcmQobSwgY2F0LCBkb21haW4pO1xuICAgIGNhdGVnb3J5UmVzdWx0c1tjYXRdID0gY2F0UmVzdWx0O1xuICAgIG90aGVyZG9tYWlucyA9IF8udW5pb24ob3RoZXJkb21haW5zLCBjYXRlZ29yeVJlc3VsdHNbY2F0XS5vdGhlckRvbWFpbnMpO1xuICAgIHJlcyArPSBgXCIke2NhdH1cIiBbbGFiZWw9XCJ7ICR7Y2F0fSB8ICR7Y2F0UmVzdWx0Lm5yRGlzdGluY3RWYWx1ZXNJbkRvbWFpbn0gVmFsdWVzIGluICR7Y2F0UmVzdWx0Lm5yUmVjb3Jkc0luRG9tYWlufSBgO1xuICAgIGlmKGNhdFJlc3VsdC5uclJlY29yZHNJbkRvbWFpbiAhPT0gY2F0UmVzdWx0Lm5yUmVjb3Jkcykge1xuICAgICAgcmVzICs9ICBgfCAgJHtjYXRSZXN1bHQubnJEaXN0aW5jdFZhbHVlcyAtIGNhdFJlc3VsdC5uckRpc3RpbmN0VmFsdWVzSW5Eb21haW59IG90aGVyIHZhbHVlcyBpbiAke2NhdFJlc3VsdC5uclJlY29yZHMgLSBjYXRSZXN1bHQubnJSZWNvcmRzSW5Eb21haW59IG90aGVyIHJlY29yZHNgO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXMgKz0gYCBgO1xuICAgIH1cbiAgICByZXMgKz0gYH1cIl1cXG5gO1xuICB9KTtcblxuICAvLyBjYWxjdWxhdGUgb3RoZXIgZG9tYWlucy5cbiAgLy8gZHJhdyBcIm90aGVyIGNhdGVnb3JpZXNcIlxuICByZXMgKz0gYG5vZGUgW2NvbG9yPXB1cnBsZSwgc3R5bGU9ZmlsbGVkXTsgXFxuYFxuICBvdGhlcmRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbihvdGhlcmRvbWFpbikge1xuICAgIHJlcyArPSBgXCIke290aGVyZG9tYWlufVwiIFxcbmA7XG4gIH0pO1xuICAvLyBjb3VudCByZWNvcmRzIGluIGRvbWFpbiA6XG4gIHZhciBuclJlY29yZHMgPSBtLnJlY29yZHMucmVkdWNlKGZ1bmN0aW9uKHByZXYsZW50cnkpIHtcbiAgcmV0dXJuIHByZXYgKyAoKGVudHJ5Ll9kb21haW4gPT09IGRvbWFpbikgPyAxIDogMCk7XG4gIH0sMCk7XG4gIHJlcyArPSBgbm9kZSBbc2hhcGU9cmVjb3JkXTsgXFxuYFxuICByZXMgKz0gYCBcInJlY29yZFwiIFtsYWJlbD1cIns8ZjA+ICR7ZG9tYWlufSB8ICR7bnJSZWNvcmRzfX1cIl0gXFxuYDtcblxuICByZXMgKz0gYCBcInJfb3RoZXJcIiBbbGFiZWw9XCJ7PGYwPiBvdGhlciB8ICR7bnJSZWNvcmRzfX1cIl0gXFxuIGA7XG5cbiAgcmVzICs9IGAjIHJlbGF0aW9uIGZyb20gY2F0ZWdvcmllcyB0byBkb21haW5cXG5gO1xuICBjYXRzLmZvckVhY2goZnVuY3Rpb24oY2F0KSB7XG4gICAgcmVzICs9IGAgXCIke2NhdH1cIiAtPiBcIiR7ZG9tYWlufVwiIFxcbmA7XG4gIH0pXG5cblxuICByZXMgKz0gYCMgcmVsYXRpb24gZnJvbSBjYXRlZ29yaWVzIHRvIHJlY29yZHNcXG5gO1xuICBjYXRzLmZvckVhY2goZnVuY3Rpb24oY2F0KSB7XG4gICAgdmFyIHJlYyA9IGNhdGVnb3J5UmVzdWx0c1tjYXRdO1xuICAgIHJlcyArPSBgIFwiJHtjYXR9XCIgLT4gXCJyZWNvcmRcIiBcXG5gO1xuICB9KVxuXG5cbiAgLy9vdGhlciBkb21haW5zIHRvIHRoaXNcbiAgY2F0cy5mb3JFYWNoKGZ1bmN0aW9uKGNhdCkge1xuXG5cbiAgfSlcblxuICAvKlxuICBjYXRzIGZvXG4gICAgZGlncmFwaCBzZHN1IHtcblx0c2l6ZT1cIjM2LDM2XCI7XG5cdG5vZGUgW2NvbG9yPXllbGxvdywgc3R5bGU9ZmlsbGVkXTtcblx0RkxQRCBGTFAgXCJCT00gRWRpdG9yXCIsIFwiV0lLSVVSTFwiIFwiVUk1IERvY3VtZW50YXRpb25cIiwgXCJVSTUgRXhhbXBsZVwiLCBcIlNUQVJUVEFcIlxuXHRCQ1Bcblx0bm9kZSBbY29sb3I9Z3JleSwgc3R5bGU9ZmlsbGVkXTtcblx0bm9kZSBbZm9udG5hbWU9XCJWZXJkYW5hXCIsIHNpemU9XCIzMCwzMFwiXTtcblx0bm9kZSBbY29sb3I9Z3JleSwgc3R5bGU9ZmlsbGVkXTtcblx0Z3JhcGggWyBmb250bmFtZSA9IFwiQXJpYWxcIixcbiAgKi9cbiAgcmVzICs9IGB9XFxuYDtcbiAgcmV0dXJuIHJlcztcbn1cblxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuXG5cbmZ1bmN0aW9uIGV4ZWNDbWQoY21kIDogc3RyaW5nKSB7XG4gZXhlYyhjbWQsIGZ1bmN0aW9uIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpIHtcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYGV4ZWMgZXJyb3I6ICR7ZXJyb3J9YClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zb2xlLmxvZyhgc3Rkb3V0OiAke3N0ZG91dH1gKVxuICAgIGNvbnNvbGUubG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApXG4gIH0pXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gdmlzTW9kZWxzKG0gOiBJTWF0Y2guSU1vZGVscywgZm9sZGVyT3V0IDogc3RyaW5nICkge1xuICBtLmRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbihzRG9tYWluKSB7XG4gICAgdmFyIHMgPSBncmFwaERvbWFpbihzRG9tYWluLG0pO1xuICAgIHZhciBmbkdyYXBoID0gZm9sZGVyT3V0ICsgXCIvXCIgKyBzRG9tYWluICsgXCIuZ3ZcIlxuICAgIGZzLndyaXRlRmlsZVN5bmMoZm5HcmFwaCwgcyk7XG4gICAgaWYocHJvY2Vzcy5lbnYuR1JBUEhWSVopIHtcbiAgICAgIGV4ZWNDbWQocHJvY2Vzcy5lbnYuR1JBUEhWSVogKyBcIiAtVGpwZWcgLU8gXCIgKyBmbkdyYXBoKTtcbiAgICB9XG4gIH0pO1xufVxuXG4iLCIvKipcbiAqIHZpc3VhbGl6ZSBhIG1vZGVsIGFuZCBjYWxjdWxhdGUgc29tZSBzdGF0aXN0aWNzXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbnZhciBNb2RlbCA9IHJlcXVpcmUoJy4vbW9kZWwnKTtcbnZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG47XG5mdW5jdGlvbiBjYWxjQ2F0ZWdvcnlSZWNvcmQobSwgY2F0ZWdvcnksIGRvbWFpbikge1xuICAgIHZhciBvdGhlcmRvbWFpbnMgPSBNb2RlbC5nZXREb21haW5zRm9yQ2F0ZWdvcnkobSwgY2F0ZWdvcnkpO1xuICAgIF8ucHVsbChvdGhlcmRvbWFpbnMsIGRvbWFpbik7XG4gICAgdmFyIHJlcyA9IHtcbiAgICAgICAgb3RoZXJkb21haW5zOiBvdGhlcmRvbWFpbnMsXG4gICAgICAgIG5yRGlzdGluY3RWYWx1ZXM6IDAsXG4gICAgICAgIG5yRGlzdGluY3RWYWx1ZXNJbkRvbWFpbjogMCxcbiAgICAgICAgbnJSZWNvcmRzOiAwLFxuICAgICAgICBuclJlY29yZHNJbkRvbWFpbjogMFxuICAgIH07XG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgIHZhciB2YWx1ZXNJbkRvbWFpbiA9IFtdO1xuICAgIHZhciBuclJlY29yZHNJbkRvbWFpbiA9IDA7XG4gICAgdmFyIGRpc3RpbmN0VmFsdWVzID0gbS5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKG9FbnRyeSkge1xuICAgICAgICBpZiAob0VudHJ5W2NhdGVnb3J5XSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gb0VudHJ5W2NhdGVnb3J5XTtcbiAgICAgICAgICAgIGlmIChvRW50cnkuX2RvbWFpbiA9PT0gZG9tYWluKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzSW5Eb21haW5bdmFsdWVdID0gKHZhbHVlc0luRG9tYWluW3ZhbHVlXSB8fCAwKSArIDE7XG4gICAgICAgICAgICAgICAgcmVzLm5yUmVjb3Jkc0luRG9tYWluICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZXNbdmFsdWVdID0gKHZhbHVlc1t2YWx1ZV0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgcmVzLm5yUmVjb3JkcyArPSAxO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmVzLm5yRGlzdGluY3RWYWx1ZXMgPSBPYmplY3Qua2V5cyh2YWx1ZXMpLmxlbmd0aDtcbiAgICByZXMubnJEaXN0aW5jdFZhbHVlc0luRG9tYWluID0gT2JqZWN0LmtleXModmFsdWVzSW5Eb21haW4pLmxlbmd0aDtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jYWxjQ2F0ZWdvcnlSZWNvcmQgPSBjYWxjQ2F0ZWdvcnlSZWNvcmQ7XG5mdW5jdGlvbiBncmFwaERvbWFpbihkb21haW4sIG0pIHtcbiAgICAvLyBkcmF3IGEgbW9kZWwgZG9tYWluc1xuICAgIHZhciByZXMgPSBcIlxcbiAgICBkaWdyYXBoIHNkc3Uge1xcblxcdHNpemU9XFxcIjM2LDM2XFxcIjtcXG4gICByYW5rZGlyPUxSXFxuXFx0bm9kZSBbY29sb3I9eWVsbG93LCBzdHlsZT1maWxsZWRdO1xcbiAgICBcXFwiXCIgKyBkb21haW4gKyBcIlxcXCJcXG4gIFwiO1xuICAgIC8vIGFkZCBhbGwgY2F0ZWdvcnkgbm9kZXNcbiAgICByZXMgKz0gXCJub2RlIFtzaGFwZT1yZWNvcmQsIGNvbG9yPXllbGxvdywgc3R5bGU9ZmlsbGVkXTtcXG4gXCI7XG4gICAgdmFyIGNhdHMgPSBNb2RlbC5nZXRDYXRlZ29yaWVzRm9yRG9tYWluKG0sIGRvbWFpbik7XG4gICAgdmFyIGNhdGVnb3J5UmVzdWx0cyA9IHt9O1xuICAgIHZhciBvdGhlcmRvbWFpbnMgPSBbXTtcbiAgICBjYXRzLmZvckVhY2goZnVuY3Rpb24gKGNhdCkge1xuICAgICAgICB2YXIgY2F0UmVzdWx0ID0gY2FsY0NhdGVnb3J5UmVjb3JkKG0sIGNhdCwgZG9tYWluKTtcbiAgICAgICAgY2F0ZWdvcnlSZXN1bHRzW2NhdF0gPSBjYXRSZXN1bHQ7XG4gICAgICAgIG90aGVyZG9tYWlucyA9IF8udW5pb24ob3RoZXJkb21haW5zLCBjYXRlZ29yeVJlc3VsdHNbY2F0XS5vdGhlckRvbWFpbnMpO1xuICAgICAgICByZXMgKz0gXCJcXFwiXCIgKyBjYXQgKyBcIlxcXCIgW2xhYmVsPVxcXCJ7IFwiICsgY2F0ICsgXCIgfCBcIiArIGNhdFJlc3VsdC5uckRpc3RpbmN0VmFsdWVzSW5Eb21haW4gKyBcIiBWYWx1ZXMgaW4gXCIgKyBjYXRSZXN1bHQubnJSZWNvcmRzSW5Eb21haW4gKyBcIiBcIjtcbiAgICAgICAgaWYgKGNhdFJlc3VsdC5uclJlY29yZHNJbkRvbWFpbiAhPT0gY2F0UmVzdWx0Lm5yUmVjb3Jkcykge1xuICAgICAgICAgICAgcmVzICs9IFwifCAgXCIgKyAoY2F0UmVzdWx0Lm5yRGlzdGluY3RWYWx1ZXMgLSBjYXRSZXN1bHQubnJEaXN0aW5jdFZhbHVlc0luRG9tYWluKSArIFwiIG90aGVyIHZhbHVlcyBpbiBcIiArIChjYXRSZXN1bHQubnJSZWNvcmRzIC0gY2F0UmVzdWx0Lm5yUmVjb3Jkc0luRG9tYWluKSArIFwiIG90aGVyIHJlY29yZHNcIjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlcyArPSBcIiBcIjtcbiAgICAgICAgfVxuICAgICAgICByZXMgKz0gXCJ9XFxcIl1cXG5cIjtcbiAgICB9KTtcbiAgICAvLyBjYWxjdWxhdGUgb3RoZXIgZG9tYWlucy5cbiAgICAvLyBkcmF3IFwib3RoZXIgY2F0ZWdvcmllc1wiXG4gICAgcmVzICs9IFwibm9kZSBbY29sb3I9cHVycGxlLCBzdHlsZT1maWxsZWRdOyBcXG5cIjtcbiAgICBvdGhlcmRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbiAob3RoZXJkb21haW4pIHtcbiAgICAgICAgcmVzICs9IFwiXFxcIlwiICsgb3RoZXJkb21haW4gKyBcIlxcXCIgXFxuXCI7XG4gICAgfSk7XG4gICAgLy8gY291bnQgcmVjb3JkcyBpbiBkb21haW4gOlxuICAgIHZhciBuclJlY29yZHMgPSBtLnJlY29yZHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBlbnRyeSkge1xuICAgICAgICByZXR1cm4gcHJldiArICgoZW50cnkuX2RvbWFpbiA9PT0gZG9tYWluKSA/IDEgOiAwKTtcbiAgICB9LCAwKTtcbiAgICByZXMgKz0gXCJub2RlIFtzaGFwZT1yZWNvcmRdOyBcXG5cIjtcbiAgICByZXMgKz0gXCIgXFxcInJlY29yZFxcXCIgW2xhYmVsPVxcXCJ7PGYwPiBcIiArIGRvbWFpbiArIFwiIHwgXCIgKyBuclJlY29yZHMgKyBcIn1cXFwiXSBcXG5cIjtcbiAgICByZXMgKz0gXCIgXFxcInJfb3RoZXJcXFwiIFtsYWJlbD1cXFwiezxmMD4gb3RoZXIgfCBcIiArIG5yUmVjb3JkcyArIFwifVxcXCJdIFxcbiBcIjtcbiAgICByZXMgKz0gXCIjIHJlbGF0aW9uIGZyb20gY2F0ZWdvcmllcyB0byBkb21haW5cXG5cIjtcbiAgICBjYXRzLmZvckVhY2goZnVuY3Rpb24gKGNhdCkge1xuICAgICAgICByZXMgKz0gXCIgXFxcIlwiICsgY2F0ICsgXCJcXFwiIC0+IFxcXCJcIiArIGRvbWFpbiArIFwiXFxcIiBcXG5cIjtcbiAgICB9KTtcbiAgICByZXMgKz0gXCIjIHJlbGF0aW9uIGZyb20gY2F0ZWdvcmllcyB0byByZWNvcmRzXFxuXCI7XG4gICAgY2F0cy5mb3JFYWNoKGZ1bmN0aW9uIChjYXQpIHtcbiAgICAgICAgdmFyIHJlYyA9IGNhdGVnb3J5UmVzdWx0c1tjYXRdO1xuICAgICAgICByZXMgKz0gXCIgXFxcIlwiICsgY2F0ICsgXCJcXFwiIC0+IFxcXCJyZWNvcmRcXFwiIFxcblwiO1xuICAgIH0pO1xuICAgIC8vb3RoZXIgZG9tYWlucyB0byB0aGlzXG4gICAgY2F0cy5mb3JFYWNoKGZ1bmN0aW9uIChjYXQpIHtcbiAgICB9KTtcbiAgICAvKlxuICAgIGNhdHMgZm9cbiAgICAgIGRpZ3JhcGggc2RzdSB7XG4gICAgICBzaXplPVwiMzYsMzZcIjtcbiAgICAgIG5vZGUgW2NvbG9yPXllbGxvdywgc3R5bGU9ZmlsbGVkXTtcbiAgICAgIEZMUEQgRkxQIFwiQk9NIEVkaXRvclwiLCBcIldJS0lVUkxcIiBcIlVJNSBEb2N1bWVudGF0aW9uXCIsIFwiVUk1IEV4YW1wbGVcIiwgXCJTVEFSVFRBXCJcbiAgICAgIEJDUFxuICAgICAgbm9kZSBbY29sb3I9Z3JleSwgc3R5bGU9ZmlsbGVkXTtcbiAgICAgIG5vZGUgW2ZvbnRuYW1lPVwiVmVyZGFuYVwiLCBzaXplPVwiMzAsMzBcIl07XG4gICAgICBub2RlIFtjb2xvcj1ncmV5LCBzdHlsZT1maWxsZWRdO1xuICAgICAgZ3JhcGggWyBmb250bmFtZSA9IFwiQXJpYWxcIixcbiAgICAqL1xuICAgIHJlcyArPSBcIn1cXG5cIjtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5ncmFwaERvbWFpbiA9IGdyYXBoRG9tYWluO1xudmFyIGNoaWxkX3Byb2Nlc3NfMSA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKTtcbmZ1bmN0aW9uIGV4ZWNDbWQoY21kKSB7XG4gICAgY2hpbGRfcHJvY2Vzc18xLmV4ZWMoY21kLCBmdW5jdGlvbiAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcImV4ZWMgZXJyb3I6IFwiICsgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3Rkb3V0OiBcIiArIHN0ZG91dCk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3RkZXJyOiBcIiArIHN0ZGVycik7XG4gICAgfSk7XG59XG47XG5mdW5jdGlvbiB2aXNNb2RlbHMobSwgZm9sZGVyT3V0KSB7XG4gICAgbS5kb21haW5zLmZvckVhY2goZnVuY3Rpb24gKHNEb21haW4pIHtcbiAgICAgICAgdmFyIHMgPSBncmFwaERvbWFpbihzRG9tYWluLCBtKTtcbiAgICAgICAgdmFyIGZuR3JhcGggPSBmb2xkZXJPdXQgKyBcIi9cIiArIHNEb21haW4gKyBcIi5ndlwiO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGZuR3JhcGgsIHMpO1xuICAgICAgICBpZiAocHJvY2Vzcy5lbnYuR1JBUEhWSVopIHtcbiAgICAgICAgICAgIGV4ZWNDbWQocHJvY2Vzcy5lbnYuR1JBUEhWSVogKyBcIiAtVGpwZWcgLU8gXCIgKyBmbkdyYXBoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuZXhwb3J0cy52aXNNb2RlbHMgPSB2aXNNb2RlbHM7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
