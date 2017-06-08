"use strict";
/**
 * maketable.ts
 *
 * @file
 * @copyright (c) 2016 Gerd Forstmann
 */

Object.defineProperty(exports, "__esModule", { value: true });
var debug = require("debug");
var debuglog = debug('maketable');
var fdevsta_monmove_1 = require("fdevsta_monmove");
var Utils = require("abot_utils");
var _ = require("lodash");
function makeTable(categories, theModel) {
    //
    debuglog("makeTable for " + JSON.stringify(categories));
    //
    var aFilteredDomains = fdevsta_monmove_1.Model.getDomainsForCategory(theModel, categories[0]);
    categories.forEach(function (category) {
        var catsForDomain = fdevsta_monmove_1.Model.getDomainsForCategory(theModel, category);
        aFilteredDomains = _.intersection(aFilteredDomains, catsForDomain);
    });
    if (aFilteredDomains.length === 0) {
        return {
            text: 'No commxon domains for ' + Utils.listToQuotedCommaAnd(categories),
            action: {}
        };
    }
    var domain = aFilteredDomains[0];
    //
    var columns = fdevsta_monmove_1.Model.getTableColumns(theModel, domain);
    if (columns.length === 0) {
        return {
            text: 'Apologies, but i cannot make a table for domain ' + domain + ' ',
            action: {}
        };
    }
    var indexMap = categories.map(function (category) {
        return columns.indexOf(category);
    }).filter(function (i) {
        return i >= 0;
    });
    if (indexMap.length === 0) {
        return {
            text: 'Apologies, but ' + Utils.listToQuotedCommaAnd(categories) + ' does not represent possible table columns',
            action: {}
        };
    }
    var text = "";
    var missingMap = categories.filter(function (category) {
        return columns.indexOf(category) < 0;
    });
    var usedMap = categories.filter(function (category) {
        return columns.indexOf(category) >= 0;
    });
    if (missingMap.length) {
        text = "I had to drop " + Utils.listToQuotedCommaAnd(missingMap) + ". But here you go ...\n";
    }
    text += "Creating and starting table with " + Utils.listToQuotedCommaAnd(usedMap);
    return {
        text: text,
        action: { url: "table_" + domain.toLowerCase().replace(/[^a-z0-9_]/g, '_') + "?c" + indexMap.join(',') }
    };
}
exports.makeTable = makeTable;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4ZWMvbWFrZXFiZXRhYmxlLmpzIiwiLi4vc3JjL2V4ZWMvbWFrZXFiZXRhYmxlLnRzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiZGVidWciLCJyZXF1aXJlIiwiZGVidWdsb2ciLCJmZGV2c3RhX21vbm1vdmVfMSIsIlV0aWxzIiwiXyIsIm1ha2VUYWJsZSIsImNhdGVnb3JpZXMiLCJ0aGVNb2RlbCIsIkpTT04iLCJzdHJpbmdpZnkiLCJhRmlsdGVyZWREb21haW5zIiwiTW9kZWwiLCJnZXREb21haW5zRm9yQ2F0ZWdvcnkiLCJmb3JFYWNoIiwiY2F0c0ZvckRvbWFpbiIsImNhdGVnb3J5IiwiaW50ZXJzZWN0aW9uIiwibGVuZ3RoIiwidGV4dCIsImxpc3RUb1F1b3RlZENvbW1hQW5kIiwiYWN0aW9uIiwiZG9tYWluIiwiY29sdW1ucyIsImdldFRhYmxlQ29sdW1ucyIsImluZGV4TWFwIiwibWFwIiwiaW5kZXhPZiIsImZpbHRlciIsImkiLCJtaXNzaW5nTWFwIiwidXNlZE1hcCIsInVybCIsInRvTG93ZXJDYXNlIiwicmVwbGFjZSIsImpvaW4iXSwibWFwcGluZ3MiOiJBQUFBO0FDQ0E7Ozs7Ozs7QURNQUEsT0FBT0MsY0FBUCxDQUFzQkMsT0FBdEIsRUFBK0IsWUFBL0IsRUFBNkMsRUFBRUMsT0FBTyxJQUFULEVBQTdDO0FDRUEsSUFBQUMsUUFBQUMsUUFBQSxPQUFBLENBQUE7QUFFQSxJQUFNQyxXQUFXRixNQUFNLFdBQU4sQ0FBakI7QUFHQSxJQUFBRyxvQkFBQUYsUUFBQSxpQkFBQSxDQUFBO0FBR0EsSUFBQUcsUUFBQUgsUUFBQSxZQUFBLENBQUE7QUFFQSxJQUFBSSxJQUFBSixRQUFBLFFBQUEsQ0FBQTtBQUdBLFNBQUFLLFNBQUEsQ0FBMEJDLFVBQTFCLEVBQWlEQyxRQUFqRCxFQUF5RTtBQUV2RTtBQUNBTixhQUFTLG1CQUFtQk8sS0FBS0MsU0FBTCxDQUFlSCxVQUFmLENBQTVCO0FBQ0E7QUFDQSxRQUFJSSxtQkFBbUJSLGtCQUFBUyxLQUFBLENBQU1DLHFCQUFOLENBQTRCTCxRQUE1QixFQUFzQ0QsV0FBVyxDQUFYLENBQXRDLENBQXZCO0FBQ0FBLGVBQVdPLE9BQVgsQ0FBbUIsb0JBQVE7QUFDbkIsWUFBSUMsZ0JBQWdCWixrQkFBQVMsS0FBQSxDQUFNQyxxQkFBTixDQUE0QkwsUUFBNUIsRUFBcUNRLFFBQXJDLENBQXBCO0FBQ0FMLDJCQUFtQk4sRUFBRVksWUFBRixDQUFlTixnQkFBZixFQUFnQ0ksYUFBaEMsQ0FBbkI7QUFDUCxLQUhEO0FBSUEsUUFBR0osaUJBQWlCTyxNQUFqQixLQUE0QixDQUEvQixFQUFrQztBQUNoQyxlQUFRO0FBQ05DLGtCQUFRLDRCQUE0QmYsTUFBTWdCLG9CQUFOLENBQTJCYixVQUEzQixDQUQ5QjtBQUVOYyxvQkFBUztBQUZILFNBQVI7QUFJRDtBQUNELFFBQUlDLFNBQVNYLGlCQUFpQixDQUFqQixDQUFiO0FBQ0E7QUFDQSxRQUFJWSxVQUFVcEIsa0JBQUFTLEtBQUEsQ0FBTVksZUFBTixDQUFzQmhCLFFBQXRCLEVBQWdDYyxNQUFoQyxDQUFkO0FBQ0EsUUFBR0MsUUFBUUwsTUFBUixLQUFtQixDQUF0QixFQUF5QjtBQUN2QixlQUFPO0FBQ0xDLGtCQUFRLHFEQUFxREcsTUFBckQsR0FBOEQsR0FEakU7QUFFTEQsb0JBQVM7QUFGSixTQUFQO0FBSUQ7QUFDRCxRQUFJSSxXQUFXbEIsV0FBV21CLEdBQVgsQ0FBZ0I7QUFBQSxlQUFjSCxRQUFRSSxPQUFSLENBQWdCWCxRQUFoQixDQUFkO0FBQUEsS0FBaEIsRUFBMERZLE1BQTFELENBQWlFO0FBQUEsZUFBS0MsS0FBSyxDQUFWO0FBQUEsS0FBakUsQ0FBZjtBQUNBLFFBQUdKLFNBQVNQLE1BQVQsS0FBb0IsQ0FBdkIsRUFBMEI7QUFDeEIsZUFBUTtBQUNOQyxrQkFBUSxvQkFBb0JmLE1BQU1nQixvQkFBTixDQUEyQmIsVUFBM0IsQ0FBcEIsR0FBNkQsNENBRC9EO0FBRU5jLG9CQUFTO0FBRkgsU0FBUjtBQUlEO0FBQ0QsUUFBSUYsT0FBTyxFQUFYO0FBQ0EsUUFBSVcsYUFBYXZCLFdBQVdxQixNQUFYLENBQW1CO0FBQUEsZUFBYUwsUUFBUUksT0FBUixDQUFnQlgsUUFBaEIsSUFBNEIsQ0FBekM7QUFBQSxLQUFuQixDQUFqQjtBQUNBLFFBQUllLFVBQVV4QixXQUFXcUIsTUFBWCxDQUFtQjtBQUFBLGVBQWFMLFFBQVFJLE9BQVIsQ0FBZ0JYLFFBQWhCLEtBQTZCLENBQTFDO0FBQUEsS0FBbkIsQ0FBZDtBQUNBLFFBQUdjLFdBQVdaLE1BQWQsRUFBc0I7QUFDcEJDLGVBQU8sbUJBQW1CZixNQUFNZ0Isb0JBQU4sQ0FBMkJVLFVBQTNCLENBQW5CLEdBQTRELHlCQUFuRTtBQUNEO0FBQ0RYLFlBQVEsc0NBQXFDZixNQUFNZ0Isb0JBQU4sQ0FBMkJXLE9BQTNCLENBQTdDO0FBQ0EsV0FBTztBQUNMWixjQUFPQSxJQURGO0FBRVBFLGdCQUFRLEVBQUVXLGdCQUFlVixPQUFPVyxXQUFQLEdBQXFCQyxPQUFyQixDQUE2QixhQUE3QixFQUEyQyxHQUEzQyxDQUFmLFVBQW1FVCxTQUFTVSxJQUFULENBQWMsR0FBZCxDQUFyRTtBQUZELEtBQVA7QUFJRDtBQTNDRHJDLFFBQUFRLFNBQUEsR0FBQUEsU0FBQSIsImZpbGUiOiJleGVjL21ha2VxYmV0YWJsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiBtYWtldGFibGUudHNcbiAqXG4gKiBAZmlsZVxuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBkZWJ1ZyA9IHJlcXVpcmUoXCJkZWJ1Z1wiKTtcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ21ha2V0YWJsZScpO1xuY29uc3QgZmRldnN0YV9tb25tb3ZlXzEgPSByZXF1aXJlKFwiZmRldnN0YV9tb25tb3ZlXCIpO1xuY29uc3QgVXRpbHMgPSByZXF1aXJlKFwiYWJvdF91dGlsc1wiKTtcbmNvbnN0IF8gPSByZXF1aXJlKFwibG9kYXNoXCIpO1xuZnVuY3Rpb24gbWFrZVRhYmxlKGNhdGVnb3JpZXMsIHRoZU1vZGVsKSB7XG4gICAgLy9cbiAgICBkZWJ1Z2xvZyhcIm1ha2VUYWJsZSBmb3IgXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7XG4gICAgLy9cbiAgICB2YXIgYUZpbHRlcmVkRG9tYWlucyA9IGZkZXZzdGFfbW9ubW92ZV8xLk1vZGVsLmdldERvbWFpbnNGb3JDYXRlZ29yeSh0aGVNb2RlbCwgY2F0ZWdvcmllc1swXSk7XG4gICAgY2F0ZWdvcmllcy5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgdmFyIGNhdHNGb3JEb21haW4gPSBmZGV2c3RhX21vbm1vdmVfMS5Nb2RlbC5nZXREb21haW5zRm9yQ2F0ZWdvcnkodGhlTW9kZWwsIGNhdGVnb3J5KTtcbiAgICAgICAgYUZpbHRlcmVkRG9tYWlucyA9IF8uaW50ZXJzZWN0aW9uKGFGaWx0ZXJlZERvbWFpbnMsIGNhdHNGb3JEb21haW4pO1xuICAgIH0pO1xuICAgIGlmIChhRmlsdGVyZWREb21haW5zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdGV4dDogJ05vIGNvbW14b24gZG9tYWlucyBmb3IgJyArIFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hQW5kKGNhdGVnb3JpZXMpLFxuICAgICAgICAgICAgYWN0aW9uOiB7fVxuICAgICAgICB9O1xuICAgIH1cbiAgICB2YXIgZG9tYWluID0gYUZpbHRlcmVkRG9tYWluc1swXTtcbiAgICAvL1xuICAgIHZhciBjb2x1bW5zID0gZmRldnN0YV9tb25tb3ZlXzEuTW9kZWwuZ2V0VGFibGVDb2x1bW5zKHRoZU1vZGVsLCBkb21haW4pO1xuICAgIGlmIChjb2x1bW5zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdGV4dDogJ0Fwb2xvZ2llcywgYnV0IGkgY2Fubm90IG1ha2UgYSB0YWJsZSBmb3IgZG9tYWluICcgKyBkb21haW4gKyAnICcsXG4gICAgICAgICAgICBhY3Rpb246IHt9XG4gICAgICAgIH07XG4gICAgfVxuICAgIHZhciBpbmRleE1hcCA9IGNhdGVnb3JpZXMubWFwKGNhdGVnb3J5ID0+IGNvbHVtbnMuaW5kZXhPZihjYXRlZ29yeSkpLmZpbHRlcihpID0+IGkgPj0gMCk7XG4gICAgaWYgKGluZGV4TWFwLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdGV4dDogJ0Fwb2xvZ2llcywgYnV0ICcgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChjYXRlZ29yaWVzKSArICcgZG9lcyBub3QgcmVwcmVzZW50IHBvc3NpYmxlIHRhYmxlIGNvbHVtbnMnLFxuICAgICAgICAgICAgYWN0aW9uOiB7fVxuICAgICAgICB9O1xuICAgIH1cbiAgICB2YXIgdGV4dCA9IFwiXCI7XG4gICAgdmFyIG1pc3NpbmdNYXAgPSBjYXRlZ29yaWVzLmZpbHRlcihjYXRlZ29yeSA9PiBjb2x1bW5zLmluZGV4T2YoY2F0ZWdvcnkpIDwgMCk7XG4gICAgdmFyIHVzZWRNYXAgPSBjYXRlZ29yaWVzLmZpbHRlcihjYXRlZ29yeSA9PiBjb2x1bW5zLmluZGV4T2YoY2F0ZWdvcnkpID49IDApO1xuICAgIGlmIChtaXNzaW5nTWFwLmxlbmd0aCkge1xuICAgICAgICB0ZXh0ID0gXCJJIGhhZCB0byBkcm9wIFwiICsgVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFBbmQobWlzc2luZ01hcCkgKyBcIi4gQnV0IGhlcmUgeW91IGdvIC4uLlxcblwiO1xuICAgIH1cbiAgICB0ZXh0ICs9IFwiQ3JlYXRpbmcgYW5kIHN0YXJ0aW5nIHRhYmxlIHdpdGggXCIgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZCh1c2VkTWFwKTtcbiAgICByZXR1cm4ge1xuICAgICAgICB0ZXh0OiB0ZXh0LFxuICAgICAgICBhY3Rpb246IHsgdXJsOiBgdGFibGVfJHtkb21haW4udG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtejAtOV9dL2csICdfJyl9P2Mke2luZGV4TWFwLmpvaW4oJywnKX1gIH1cbiAgICB9O1xufVxuZXhwb3J0cy5tYWtlVGFibGUgPSBtYWtlVGFibGU7XG4iLCJcclxuLyoqXHJcbiAqIG1ha2V0YWJsZS50c1xyXG4gKlxyXG4gKiBAZmlsZVxyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXHJcbiAqL1xyXG5cclxuXHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxuXHJcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ21ha2V0YWJsZScpXHJcblxyXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvaWZtYXRjaCc7XHJcbmltcG9ydCB7IE1vZGVsIH0gZnJvbSAnZmRldnN0YV9tb25tb3ZlJztcclxuXHJcblxyXG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICdhYm90X3V0aWxzJztcclxuXHJcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWFrZVRhYmxlKGNhdGVnb3JpZXMgOiBzdHJpbmdbXSwgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzICkgOiB7IHRleHQ6IHN0cmluZywgYWN0aW9uIDogeyB1cmw/IDogc3RyaW5nIH0gfVxyXG57XHJcbiAgLy9cclxuICBkZWJ1Z2xvZyhcIm1ha2VUYWJsZSBmb3IgXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7XHJcbiAgLy9cclxuICB2YXIgYUZpbHRlcmVkRG9tYWlucyA9IE1vZGVsLmdldERvbWFpbnNGb3JDYXRlZ29yeSh0aGVNb2RlbCwgY2F0ZWdvcmllc1swXSk7XHJcbiAgY2F0ZWdvcmllcy5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcclxuICAgICAgICAgIHZhciBjYXRzRm9yRG9tYWluID0gTW9kZWwuZ2V0RG9tYWluc0ZvckNhdGVnb3J5KHRoZU1vZGVsLGNhdGVnb3J5KTtcclxuICAgICAgICAgIGFGaWx0ZXJlZERvbWFpbnMgPSBfLmludGVyc2VjdGlvbihhRmlsdGVyZWREb21haW5zLGNhdHNGb3JEb21haW4pO1xyXG4gIH0pO1xyXG4gIGlmKGFGaWx0ZXJlZERvbWFpbnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICByZXR1cm4gIHtcclxuICAgICAgdGV4dCA6ICAnTm8gY29tbXhvbiBkb21haW5zIGZvciAnICsgVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFBbmQoY2F0ZWdvcmllcyksXHJcbiAgICAgIGFjdGlvbiA6IHt9XHJcbiAgICB9XHJcbiAgfVxyXG4gIHZhciBkb21haW4gPSBhRmlsdGVyZWREb21haW5zWzBdO1xyXG4gIC8vXHJcbiAgdmFyIGNvbHVtbnMgPSBNb2RlbC5nZXRUYWJsZUNvbHVtbnModGhlTW9kZWwsIGRvbWFpbik7XHJcbiAgaWYoY29sdW1ucy5sZW5ndGggPT09IDApIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHRleHQgOiAgJ0Fwb2xvZ2llcywgYnV0IGkgY2Fubm90IG1ha2UgYSB0YWJsZSBmb3IgZG9tYWluICcgKyBkb21haW4gKyAnICcsXHJcbiAgICAgIGFjdGlvbiA6IHt9XHJcbiAgICB9XHJcbiAgfVxyXG4gIHZhciBpbmRleE1hcCA9IGNhdGVnb3JpZXMubWFwKCBjYXRlZ29yeSA9PiAgIGNvbHVtbnMuaW5kZXhPZihjYXRlZ29yeSkgKS5maWx0ZXIoaSA9PiBpID49IDApO1xyXG4gIGlmKGluZGV4TWFwLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgcmV0dXJuICB7XHJcbiAgICAgIHRleHQgOiAgJ0Fwb2xvZ2llcywgYnV0ICcgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChjYXRlZ29yaWVzKSArICcgZG9lcyBub3QgcmVwcmVzZW50IHBvc3NpYmxlIHRhYmxlIGNvbHVtbnMnLFxyXG4gICAgICBhY3Rpb24gOiB7fVxyXG4gICAgfVxyXG4gIH1cclxuICB2YXIgdGV4dCA9IFwiXCI7XHJcbiAgdmFyIG1pc3NpbmdNYXAgPSBjYXRlZ29yaWVzLmZpbHRlciggY2F0ZWdvcnkgPT4gIGNvbHVtbnMuaW5kZXhPZihjYXRlZ29yeSkgPCAwICk7XHJcbiAgdmFyIHVzZWRNYXAgPSBjYXRlZ29yaWVzLmZpbHRlciggY2F0ZWdvcnkgPT4gIGNvbHVtbnMuaW5kZXhPZihjYXRlZ29yeSkgPj0gMCk7XHJcbiAgaWYobWlzc2luZ01hcC5sZW5ndGgpIHtcclxuICAgIHRleHQgPSBcIkkgaGFkIHRvIGRyb3AgXCIgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChtaXNzaW5nTWFwKSArIFwiLiBCdXQgaGVyZSB5b3UgZ28gLi4uXFxuXCJcclxuICB9XHJcbiAgdGV4dCArPSBcIkNyZWF0aW5nIGFuZCBzdGFydGluZyB0YWJsZSB3aXRoIFwiKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZCh1c2VkTWFwKTtcclxuICByZXR1cm4ge1xyXG4gICAgdGV4dCA6IHRleHQsXHJcbiAgYWN0aW9uIDp7IHVybCA6IGB0YWJsZV8ke2RvbWFpbi50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16MC05X10vZywnXycpfT9jJHtpbmRleE1hcC5qb2luKCcsJyl9YCB9XHJcbiAgfTtcclxufVxyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
