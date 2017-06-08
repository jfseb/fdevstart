"use strict";
/**
 * visualize a model and calculate some statistics
 */

Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var fdevsta_monmove_1 = require("fdevsta_monmove");
var Util = require("abot_utils");
var Describe = require("../match/describe");
var _ = require("lodash");
var debug = require("debug");
//import * as elasticlunr from 'elasticlunr';
var debuglog = debug('vismodel.ts');
;
var elasticlunr = require('elasticlunr');
function JSONEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\'/g, "\\'").replace(/\"/g, '\\"').replace(/\&/g, "\\&").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
    // .replace(/\b/g, "\\b")
    // .replace(/\f/g, "\\f");
}
exports.JSONEscape = JSONEscape;
;
function makeLunrIndex(modelpath, output, silent) {
    var mdl = JSON.parse('' + fs.readFileSync(modelpath + '.model.json'));
    var data = JSON.parse('' + fs.readFileSync(modelpath + '.data.json'));
    var cats = mdl.category.filter(function (a) {
        return typeof a !== 'string';
    });
    var qbeDataObjects = cats.filter(function (cat) {
        return cat.QBE || cat.QBEInclude;
    });
    //console.log("here cats" + JSON.stringify(cats));
    //console.log("\nhere data objects" + JSON.stringify(qbeDataObjects));
    var qbeDataNames = qbeDataObjects.map(function (cat) {
        return cat.name;
    });
    qbeDataNames = _.union(qbeDataNames, mdl.columns);
    var LUNRIndex = cats.filter(function (cat) {
        return cat.LUNRIndex;
    }).map(function (cat) {
        return cat.name;
    });
    //var elasticlunr = require('lunr');
    var bomdata = data;
    // index all LUNR properties
    var index = elasticlunr(function () {
        var that = this;
        LUNRIndex /*
                  ["appId",
                  "AppKey",
                  "AppName",
                    "ApplicationComponent",
                    "RoleName",
                    "ApplicationType",
                    "BSPName",
                    "BSPApplicationURL",
                    "releaseName",
                    "BusinessCatalog",
                    "TechnicalCatalog"] */
        .forEach(function (field) {
            that.addField(field);
        });
        this.setRef('id');
        this.saveDocument(false);
    });
    bomdata.forEach(function (o, index) {
        o.id = index;
    });
    bomdata.forEach(function (record) {
        index.addDoc(record);
    });
    var elastic = index;
    // dump the lunr index
    //
    var theIndex = index.toJSON();
    var columns = mdl.columns.map(function (colname) {
        var res = cats.filter(function (cat) {
            return cat.name === colname;
        });
        if (res.length !== 1) {
            throw new Error("undefined or non-object column : " + colname);
        }
        ;
        return res[0];
    });
    var columnNames = columns.map(function (col) {
        return col.name;
    });
    var jsonp = "var mdldata = {};\n//columns \n mdldata.columns = [\"" + columns.map(function (col) {
        return col.name;
    }).join('","') + "\"];";
    var json = "{ \"columns\"  : [\"" + columns.map(function (col) {
        return JSONEscape(col.name);
    }).join('","') + "\"],";
    // jsonp += `\n mdldata.fulldata = ${JSON.stringify(bomdata)};\n`;
    //jsonp += `\n//columns info \n mdldata.lunrcolumns = ["{${LUNRIndex.join('","')}"];`;
    jsonp += "\n//columns info \n mdldata.columnsDescription = {" + columns.map(function (col) {
        return " \n \"" + col.name + "\" :  \"" + JSONEscape(col.description || col.name) + "\" ";
    }).join(',') + "\n      };";
    json += "\"columnsDescription\" : {" + columns.map(function (col) {
        return " \n \"" + col.name + "\" :  \"" + JSONEscape(col.description || col.name) + "\" ";
    }).join(',') + "\n      },";
    jsonp += "\n//columns info \n mdldata.columnsDefaultWidth = {" + columns.map(function (col) {
        return " \n \"" + col.name + "\" : " + (col.defaultWidth || 150) + " ";
    }).join(',') + "\n      };";
    json += "\n\"columnsDefaultWidth\" : {" + columns.map(function (col) {
        return " \n \"" + col.name + "\" : " + (col.defaultWidth || 150) + " ";
    }).join(',') + "\n      },";
    var theIndexStr = JSON.stringify(theIndex);
    jsonp += "\nvar serIndex =\"" + JSONEscape(theIndexStr) + "\";\n";
    // jsonp += "\nvar serIndex =" + JSON.stringify(theIndex) + ";\n";
    json += '\n"serIndex" :' + theIndexStr + ',';
    //console.log("here all names " + JSON.stringify(qbeDataNames));
    var cleanseddata = bomdata.map(function (o) {
        var res = {};
        qbeDataNames.forEach(function (key) {
            res[key] = o[key];
        });
        return res;
    });
    if (!silent) {
        console.log("dumping " + output);
        console.log("length of index str" + theIndexStr.length);
        console.log("available          " + columns.length + " columns");
        console.log("returning as data  " + qbeDataNames.length + " columns");
        console.log("indexing           " + LUNRIndex.length + " columns");
        console.log('returned but not available', _.difference(qbeDataNames, columnNames).join(", "));
        console.log('returned but not indexed', _.difference(qbeDataNames, LUNRIndex).join(", "));
    }
    jsonp += "var data=" + JSON.stringify(cleanseddata) + ";";
    json += '"data":' + JSON.stringify(cleanseddata) + "\n}";
    jsonp += "\n\n           // var elastic = elasticlunr.Index.load(serIndex);\n\n  ";
    //fs.writeFileSync(output + ".lunr.js", jsonp);
    fs.writeFileSync(output + ".lunr.json", json);
}
exports.makeLunrIndex = makeLunrIndex;
/*

  var index = elastilunr.Index.load(obj);


}

 "QBE" : false,
      "QBEInclude" : true,
      "LUNRIndex": false
*/
function calcCategoryRecord(m, category, domain) {
    var otherdomains = fdevsta_monmove_1.Model.getDomainsForCategory(m, category);
    _.pull(otherdomains, domain);
    var res = {
        otherdomains: otherdomains,
        nrDistinctValues: 0,
        nrDistinctValuesInDomain: 0,
        nrRecords: 0,
        nrRecordsInDomain: 0,
        nrTotalRecordsInDomain: 0
    };
    var values = [];
    var valuesInDomain = [];
    var nrRecordsInDomain = 0;
    var distinctValues = m.records.forEach(function (oEntry) {
        if (oEntry._domain === domain) {
            res.nrTotalRecordsInDomain += 1;
        }
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
    var cats = fdevsta_monmove_1.Model.getCategoriesForDomain(m, domain);
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
/*
    categoryDesc : theModel.full.domain[filterdomain].categories[category],
    distinct : distinct,
    delta : delta,
    presentRecords : recordCount.presentrecords,
    percPresent : percent,
    sampleValues : valuesList
  }
*/
function replaceBr(string) {
    string = string.replace(/\n/g, "\n\t\t\t\t\t\t\t\t\t\t\tbr\n\t\t\t\t\t\t\t\t\t\t\t| ");
    return string;
}
/**
 * generate a textual representation of a domain
 */
function tabDomain(domain, m) {
    // draw a model domains
    var cats = fdevsta_monmove_1.Model.getCategoriesForDomain(m, domain);
    cats = fdevsta_monmove_1.Model.sortCategoriesByImportance(m.full.domain[domain].categories || {}, cats);
    //console.log(cats.join("\n"));
    var catdesc = Describe.getCategoryStatsInDomain(cats[0], domain, m);
    var catResult = calcCategoryRecord(m, cats[0], domain);
    var domainDescr = m.full.domain[domain].description || "";
    domainDescr = replaceBr(domainDescr);
    var res = "\n\n// preset form values if we receive a userdata object //\n- user = user\n\nextends ../layout_p\n\nblock content\n\n\tnav.navbar.navbar-default.navbar-fixed-top\n\t\t.container\n\t\t\t.navbar-header\n\t\t\t\t.navbar-brand(style='bgcolor:orange;color:darkblue;font-family:Arial Black;font-size:15.118px') wosap domain " + domain + "\n\t\t\tul.nav.navbar-nav.navbar-right #{uid}\n\t\t\t\tli\n\t\t\t\t\t.navbar-btn#btn-logout.btn.btn-default(onclick=\"location.href='/home'\")\n\t\t\t\t\t\t| back to home\n\n\tp  &nbsp;\n\tp &nbsp;\n\tp\n\n\tdiv.well\n\t\th3 domain \"" + domain + "\"\n\t\t\tspan.pull-right " + catResult.nrTotalRecordsInDomain + " records\n\t\tp\n\t\tspan " + domainDescr + "\n\n\t\ttable.table.table-condensed.table-striped\n\t\t\tthead\n\t\t\t\ttr\n\t\t\t\t\tth category\n\t\t\t\t\tth(style=\"width:10%\") count\n\t\t\t\t\tth\n\t\t\t\t\t\ttable\n\t\t\t\t\t\t\ttr\n\t\t\t\t\t\t\t\ttd synonyms\n\t\t\t\t\t\t\ttr\n\t\t\t\t\t\t\t\ttd description\n\t\t\t\t\t\t\ttr\n\t\t\t\t\t\t\t\ttd example values\n\t\t\ttbody\n";
    var categoryResults = {};
    var otherdomains = [];
    var categoryMap = m.full.domain[domain].categories || {};
    cats.forEach(function (cat) {
        var catdesc = Describe.getCategoryStatsInDomain(cat, domain, m);
        //console.log(JSON.stringify(catdesc));
        var catResult = calcCategoryRecord(m, cat, domain);
        categoryResults[cat] = catResult;
        otherdomains = _.union(otherdomains, categoryResults[cat].otherDomains);
        /*
            res += `"${cat}" [label="{ ${cat} | ${catResult.nrDistinctValuesInDomain} Values in ${catResult.nrRecordsInDomain} `;
            if(catResult.nrRecordsInDomain !== catResult.nrRecords) {
              res +=  `|  ${catResult.nrDistinctValues - catResult.nrDistinctValuesInDomain} other values in ${catResult.nrRecords - catResult.nrRecordsInDomain} other records`;
            } else {
              res += ` `;
            }
            res += `}"]\n`;
        */
        //console.log(JSON.stringify(m.full.domain[domain]));
        if (m.full.domain[domain].categories[cat]) {
            var synonymsString = Util.listToCommaAnd(catdesc.categoryDesc && catdesc.categoryDesc.synonyms && catdesc.categoryDesc.synonyms || []) || "&nbsp;";
            res += "\n\t\t\ttr\n\t\t\t\t\ttd.cat_count " + cat + "\n\t\t\t\t\ttd " + catdesc.presentRecords + " distinct values in " + catdesc.percPresent + "% of records\n\t\t\t\t\ttd\n\t\t\t\t\t\ttable\n\t\t\t\t\t\t\ttr.cat_synonyms\n\t\t\t\t\t\t\t\ttd " + synonymsString + "\n\t\t\t\t\t\t\ttr.cat_description\n\t\t\t\t\t\t\t\ttd " + replaceBr(catdesc.categoryDesc && catdesc.categoryDesc.description || "") + "\n\t\t\t\t\t\t\ttr.cat_samplevalues\n\t\t\t\t\t\t\t\ttd " + replaceBr(catdesc.sampleValues) + "\n      ";
        }
    });
    var othercats = cats.length - Object.keys(m.full.domain[domain].categories).length;
    var remainingCategories = _.difference(cats, Object.keys(m.full.domain[domain].categories));
    if (othercats > 0) {
        res += "\n\t\tp   and " + othercats + " other categories\n\t\t| " + Util.listToCommaAnd(remainingCategories) + "\n       ";
    }
    /*
      // calculate other domains.
      // draw "other categories"
      res += `node [color=purple, style=filled]; \n`
      otherdomains.forEach(function(otherdomain) {
        res += `"${otherdomain}" \n`;
      });
      // count records in domain :
      var nrRecords = m.records.reduce(function(prev,entry) {
      return prev + ((entry._domain === domain) ? 1 : 0);
      },0);
      res += `node [shape=record]; \n`
      res += ` "record" [label="{<f0> ${domain} | ${nrRecords}}"] \n`;
          res += ` "r_other" [label="{<f0> other | ${nrRecords}}"] \n `;
          res += `# relation from categories to domain\n`;
      cats.forEach(function(cat) {
        res += ` "${cat}" -> "${domain}" \n`;
      })
      
      res += `# relation from categories to records\n`;
      cats.forEach(function(cat) {
        var rec = categoryResults[cat];
        res += ` "${cat}" -> "record" \n`;
      })
      
      //other domains to this
      cats.forEach(function(cat) {
      
      })
    */
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
    res += "\n\t\th3 Version\n\t\t\ta.small(href=\"/whatsnew\")\n\n\nblock scripts\n\tscript(src='/vendor/jquery-2.2.3.min.js')\n\tscript(src='/vendor/bootstrap.min.js')\n\tscript(src='/js/views/settings.js')\n";
    return res;
}
exports.tabDomain = tabDomain;
var child_process_1 = require("child_process");
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
        var fnGraph = folderOut + "/" + sDomain.replace(/ /g, '_') + ".gv";
        fs.writeFileSync(fnGraph, s);
        if (process.env.GRAPHVIZ) {
            console.log("here the file " + fnGraph);
            execCmd(process.env.GRAPHVIZ + " -Tjpeg -O " + fnGraph);
        }
    });
}
exports.visModels = visModels;
function tabModels(m, folderOut) {
    m.domains.forEach(function (sDomain) {
        var s = tabDomain(sDomain, m);
        var fnGraph = folderOut + "/" + sDomain.replace(/ /g, '_') + ".jade";
        debuglog("here the file " + fnGraph);
        fs.writeFileSync(fnGraph, s);
    });
}
exports.tabModels = tabModels;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZGVsL3Zpc21vZGVsLmpzIiwiLi4vc3JjL21vZGVsL3Zpc21vZGVsLnRzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiZnMiLCJyZXF1aXJlIiwiZmRldnN0YV9tb25tb3ZlXzEiLCJVdGlsIiwiRGVzY3JpYmUiLCJfIiwiZGVidWciLCJkZWJ1Z2xvZyIsImVsYXN0aWNsdW5yIiwiSlNPTkVzY2FwZSIsInMiLCJyZXBsYWNlIiwibWFrZUx1bnJJbmRleCIsIm1vZGVscGF0aCIsIm91dHB1dCIsInNpbGVudCIsIm1kbCIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlU3luYyIsImRhdGEiLCJjYXRzIiwiY2F0ZWdvcnkiLCJmaWx0ZXIiLCJhIiwicWJlRGF0YU9iamVjdHMiLCJjYXQiLCJRQkUiLCJRQkVJbmNsdWRlIiwicWJlRGF0YU5hbWVzIiwibWFwIiwibmFtZSIsInVuaW9uIiwiY29sdW1ucyIsIkxVTlJJbmRleCIsImJvbWRhdGEiLCJpbmRleCIsInRoYXQiLCJmb3JFYWNoIiwiZmllbGQiLCJhZGRGaWVsZCIsInNldFJlZiIsInNhdmVEb2N1bWVudCIsIm8iLCJpZCIsInJlY29yZCIsImFkZERvYyIsImVsYXN0aWMiLCJ0aGVJbmRleCIsInRvSlNPTiIsInJlcyIsImNvbG5hbWUiLCJsZW5ndGgiLCJFcnJvciIsImNvbHVtbk5hbWVzIiwiY29sIiwianNvbnAiLCJqb2luIiwianNvbiIsImRlc2NyaXB0aW9uIiwiZGVmYXVsdFdpZHRoIiwidGhlSW5kZXhTdHIiLCJzdHJpbmdpZnkiLCJjbGVhbnNlZGRhdGEiLCJrZXkiLCJjb25zb2xlIiwibG9nIiwiZGlmZmVyZW5jZSIsIndyaXRlRmlsZVN5bmMiLCJjYWxjQ2F0ZWdvcnlSZWNvcmQiLCJtIiwiZG9tYWluIiwib3RoZXJkb21haW5zIiwiTW9kZWwiLCJnZXREb21haW5zRm9yQ2F0ZWdvcnkiLCJwdWxsIiwibnJEaXN0aW5jdFZhbHVlcyIsIm5yRGlzdGluY3RWYWx1ZXNJbkRvbWFpbiIsIm5yUmVjb3JkcyIsIm5yUmVjb3Jkc0luRG9tYWluIiwibnJUb3RhbFJlY29yZHNJbkRvbWFpbiIsInZhbHVlcyIsInZhbHVlc0luRG9tYWluIiwiZGlzdGluY3RWYWx1ZXMiLCJyZWNvcmRzIiwib0VudHJ5IiwiX2RvbWFpbiIsImtleXMiLCJncmFwaERvbWFpbiIsImdldENhdGVnb3JpZXNGb3JEb21haW4iLCJjYXRlZ29yeVJlc3VsdHMiLCJjYXRSZXN1bHQiLCJvdGhlckRvbWFpbnMiLCJvdGhlcmRvbWFpbiIsInJlZHVjZSIsInByZXYiLCJlbnRyeSIsInJlYyIsInJlcGxhY2VCciIsInN0cmluZyIsInRhYkRvbWFpbiIsInNvcnRDYXRlZ29yaWVzQnlJbXBvcnRhbmNlIiwiZnVsbCIsImNhdGVnb3JpZXMiLCJjYXRkZXNjIiwiZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluIiwiZG9tYWluRGVzY3IiLCJjYXRlZ29yeU1hcCIsInN5bm9ueW1zU3RyaW5nIiwibGlzdFRvQ29tbWFBbmQiLCJjYXRlZ29yeURlc2MiLCJzeW5vbnltcyIsInByZXNlbnRSZWNvcmRzIiwicGVyY1ByZXNlbnQiLCJzYW1wbGVWYWx1ZXMiLCJvdGhlcmNhdHMiLCJyZW1haW5pbmdDYXRlZ29yaWVzIiwiY2hpbGRfcHJvY2Vzc18xIiwiZXhlY0NtZCIsImNtZCIsImV4ZWMiLCJlcnJvciIsInN0ZG91dCIsInN0ZGVyciIsInZpc01vZGVscyIsImZvbGRlck91dCIsImRvbWFpbnMiLCJzRG9tYWluIiwiZm5HcmFwaCIsInByb2Nlc3MiLCJlbnYiLCJHUkFQSFZJWiIsInRhYk1vZGVscyJdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7OztBRElBQSxPQUFPQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QyxFQUFFQyxPQUFPLElBQVQsRUFBN0M7QUNLQSxJQUFBQyxLQUFBQyxRQUFBLElBQUEsQ0FBQTtBQUVBLElBQUFDLG9CQUFBRCxRQUFBLGlCQUFBLENBQUE7QUFFQSxJQUFBRSxPQUFBRixRQUFBLFlBQUEsQ0FBQTtBQUVBLElBQUFHLFdBQUFILFFBQUEsbUJBQUEsQ0FBQTtBQUVBLElBQUFJLElBQUFKLFFBQUEsUUFBQSxDQUFBO0FBQ0EsSUFBQUssUUFBQUwsUUFBQSxPQUFBLENBQUE7QUFFQTtBQUVBLElBQUlNLFdBQVdELE1BQU0sYUFBTixDQUFmO0FBU0M7QUFFRCxJQUFJRSxjQUFjUCxRQUFRLGFBQVIsQ0FBbEI7QUFHQSxTQUFBUSxVQUFBLENBQTJCQyxDQUEzQixFQUFvQztBQUVsQyxXQUFPQSxFQUFFQyxPQUFGLENBQVUsS0FBVixFQUFpQixNQUFqQixFQUF5QkEsT0FBekIsQ0FBaUMsS0FBakMsRUFBd0MsS0FBeEMsRUFDSkEsT0FESSxDQUNJLEtBREosRUFDVyxLQURYLEVBRUpBLE9BRkksQ0FFSSxLQUZKLEVBRVcsS0FGWCxFQUdKQSxPQUhJLENBR0ksS0FISixFQUdXLEtBSFgsRUFJSkEsT0FKSSxDQUlJLEtBSkosRUFJVyxLQUpYLEVBS0pBLE9BTEksQ0FLSSxLQUxKLEVBS1csS0FMWCxDQUFQO0FBTUE7QUFDQTtBQUNEO0FBVkRiLFFBQUFXLFVBQUEsR0FBQUEsVUFBQTtBQVVDO0FBR0QsU0FBQUcsYUFBQSxDQUE4QkMsU0FBOUIsRUFBaURDLE1BQWpELEVBQWlFQyxNQUFqRSxFQUFtRjtBQUNqRixRQUFJQyxNQUFNQyxLQUFLQyxLQUFMLENBQVcsS0FBS2xCLEdBQUdtQixZQUFILENBQWdCTixZQUFZLGFBQTVCLENBQWhCLENBQVY7QUFDQSxRQUFJTyxPQUFPSCxLQUFLQyxLQUFMLENBQVcsS0FBS2xCLEdBQUdtQixZQUFILENBQWdCTixZQUFZLFlBQTVCLENBQWhCLENBQVg7QUFFQSxRQUFJUSxPQUFPTCxJQUFJTSxRQUFKLENBQWFDLE1BQWIsQ0FBb0I7QUFBQSxlQUFLLE9BQU9DLENBQVAsS0FBYSxRQUFsQjtBQUFBLEtBQXBCLENBQVg7QUFFQSxRQUFJQyxpQkFBaUJKLEtBQUtFLE1BQUwsQ0FBWTtBQUFBLGVBQVFHLElBQUlDLEdBQUosSUFBV0QsSUFBSUUsVUFBdkI7QUFBQSxLQUFaLENBQXJCO0FBRUE7QUFDQTtBQUNBLFFBQUlDLGVBQWVKLGVBQWVLLEdBQWYsQ0FBbUI7QUFBQSxlQUFPSixJQUFJSyxJQUFYO0FBQUEsS0FBbkIsQ0FBbkI7QUFFQUYsbUJBQWV4QixFQUFFMkIsS0FBRixDQUFRSCxZQUFSLEVBQXNCYixJQUFJaUIsT0FBMUIsQ0FBZjtBQUdBLFFBQUlDLFlBQVliLEtBQUtFLE1BQUwsQ0FBWTtBQUFBLGVBQU9HLElBQUlRLFNBQVg7QUFBQSxLQUFaLEVBQWtDSixHQUFsQyxDQUFzQztBQUFBLGVBQU9KLElBQUlLLElBQVg7QUFBQSxLQUF0QyxDQUFoQjtBQUNBO0FBQ0EsUUFBSUksVUFBVWYsSUFBZDtBQUNBO0FBQ0EsUUFBSWdCLFFBQVE1QixZQUFZLFlBQUE7QUFDdEIsWUFBSTZCLE9BQU8sSUFBWDtBQUNBSCxrQkFBVTs7Ozs7Ozs7Ozs7O0FBQVYsU0FXb0NJLE9BWHBDLENBVzRDLFVBQVVDLEtBQVYsRUFBZTtBQUN2REYsaUJBQUtHLFFBQUwsQ0FBY0QsS0FBZDtBQUNELFNBYkg7QUFjQSxhQUFLRSxNQUFMLENBQVksSUFBWjtBQUNBLGFBQUtDLFlBQUwsQ0FBa0IsS0FBbEI7QUFDRCxLQWxCVyxDQUFaO0FBbUJBUCxZQUFRRyxPQUFSLENBQWdCLFVBQVVLLENBQVYsRUFBYVAsS0FBYixFQUFrQjtBQUNoQ08sVUFBRUMsRUFBRixHQUFPUixLQUFQO0FBQ0QsS0FGRDtBQUdBRCxZQUFRRyxPQUFSLENBQWdCLFVBQVVPLE1BQVYsRUFBZ0I7QUFDOUJULGNBQU1VLE1BQU4sQ0FBYUQsTUFBYjtBQUNELEtBRkQ7QUFHQSxRQUFJRSxVQUFVWCxLQUFkO0FBRUE7QUFDQTtBQUNBLFFBQUlZLFdBQVdaLE1BQU1hLE1BQU4sRUFBZjtBQUNBLFFBQUloQixVQUFVakIsSUFBSWlCLE9BQUosQ0FBWUgsR0FBWixDQUFnQixtQkFBTztBQUNuQyxZQUFJb0IsTUFBTTdCLEtBQUtFLE1BQUwsQ0FBWTtBQUFBLG1CQUFPRyxJQUFJSyxJQUFKLEtBQWFvQixPQUFwQjtBQUFBLFNBQVosQ0FBVjtBQUNBLFlBQUdELElBQUlFLE1BQUosS0FBZSxDQUFsQixFQUFxQjtBQUNuQixrQkFBTSxJQUFJQyxLQUFKLENBQVUsc0NBQXNDRixPQUFoRCxDQUFOO0FBQ0Q7QUFBQTtBQUNELGVBQU9ELElBQUksQ0FBSixDQUFQO0FBQ0QsS0FOYSxDQUFkO0FBUUEsUUFBSUksY0FBY3JCLFFBQVFILEdBQVIsQ0FBWTtBQUFBLGVBQU95QixJQUFJeEIsSUFBWDtBQUFBLEtBQVosQ0FBbEI7QUFFQSxRQUFJeUIsa0VBQStEdkIsUUFBUUgsR0FBUixDQUFZO0FBQUEsZUFBT3lCLElBQUl4QixJQUFYO0FBQUEsS0FBWixFQUE2QjBCLElBQTdCLENBQWtDLEtBQWxDLENBQS9ELFNBQUo7QUFFQSxRQUFJQyxnQ0FBMkJ6QixRQUFRSCxHQUFSLENBQVk7QUFBQSxlQUFPckIsV0FBVzhDLElBQUl4QixJQUFmLENBQVA7QUFBQSxLQUFaLEVBQXlDMEIsSUFBekMsQ0FBOEMsS0FBOUMsQ0FBM0IsU0FBSjtBQUNBO0FBQ0E7QUFFQUQsb0VBQThEdkIsUUFBUUgsR0FBUixDQUFZO0FBQUEsMEJBQ2hFeUIsSUFBSXhCLElBRDRELGdCQUMvQ3RCLFdBQVc4QyxJQUFJSSxXQUFKLElBQW1CSixJQUFJeEIsSUFBbEMsQ0FEK0M7QUFBQSxLQUFaLEVBRTVEMEIsSUFGNEQsQ0FFdkQsR0FGdUQsQ0FBOUQ7QUFLQUMsMkNBQW1DekIsUUFBUUgsR0FBUixDQUFZO0FBQUEsMEJBQ3JDeUIsSUFBSXhCLElBRGlDLGdCQUNwQnRCLFdBQVc4QyxJQUFJSSxXQUFKLElBQW1CSixJQUFJeEIsSUFBbEMsQ0FEb0I7QUFBQSxLQUFaLEVBRWpDMEIsSUFGaUMsQ0FFNUIsR0FGNEIsQ0FBbkM7QUFNQUQscUVBQStEdkIsUUFBUUgsR0FBUixDQUFZO0FBQUEsMEJBQ2pFeUIsSUFBSXhCLElBRDZELGNBQ2xEd0IsSUFBSUssWUFBSixJQUFvQixHQUQ4QjtBQUFBLEtBQVosRUFFN0RILElBRjZELENBRXhELEdBRndELENBQS9EO0FBS0FDLDhDQUFzQ3pCLFFBQVFILEdBQVIsQ0FBWTtBQUFBLDBCQUN4Q3lCLElBQUl4QixJQURvQyxjQUN6QndCLElBQUlLLFlBQUosSUFBb0IsR0FESztBQUFBLEtBQVosRUFFcENILElBRm9DLENBRS9CLEdBRitCLENBQXRDO0FBT0EsUUFBSUksY0FBYzVDLEtBQUs2QyxTQUFMLENBQWVkLFFBQWYsQ0FBbEI7QUFFQVEsYUFBUyx1QkFBdUIvQyxXQUFXb0QsV0FBWCxDQUF2QixHQUFpRCxPQUExRDtBQUNBO0FBR0FILFlBQVEsbUJBQW1CRyxXQUFuQixHQUFrQyxHQUExQztBQUVBO0FBQ0EsUUFBSUUsZUFBZTVCLFFBQVFMLEdBQVIsQ0FBWSxhQUFDO0FBQzlCLFlBQUlvQixNQUFNLEVBQVY7QUFDQXJCLHFCQUFhUyxPQUFiLENBQXFCLGVBQUc7QUFDdEJZLGdCQUFJYyxHQUFKLElBQVdyQixFQUFFcUIsR0FBRixDQUFYO0FBQ0QsU0FGRDtBQUdBLGVBQU9kLEdBQVA7QUFDRCxLQU5rQixDQUFuQjtBQVFBLFFBQUcsQ0FBQ25DLE1BQUosRUFBWTtBQUNWa0QsZ0JBQVFDLEdBQVIsQ0FBWSxhQUFhcEQsTUFBekI7QUFDQW1ELGdCQUFRQyxHQUFSLENBQVksd0JBQXdCTCxZQUFZVCxNQUFoRDtBQUNBYSxnQkFBUUMsR0FBUixDQUFZLHdCQUF3QmpDLFFBQVFtQixNQUFoQyxHQUF5QyxVQUFyRDtBQUNBYSxnQkFBUUMsR0FBUixDQUFZLHdCQUF3QnJDLGFBQWF1QixNQUFyQyxHQUE4QyxVQUExRDtBQUNBYSxnQkFBUUMsR0FBUixDQUFZLHdCQUF3QmhDLFVBQVVrQixNQUFsQyxHQUEyQyxVQUF2RDtBQUNBYSxnQkFBUUMsR0FBUixDQUFZLDRCQUFaLEVBQTJDN0QsRUFBRThELFVBQUYsQ0FBYXRDLFlBQWIsRUFBMkJ5QixXQUEzQixFQUF3Q0csSUFBeEMsQ0FBNkMsSUFBN0MsQ0FBM0M7QUFDQVEsZ0JBQVFDLEdBQVIsQ0FBWSwwQkFBWixFQUF5QzdELEVBQUU4RCxVQUFGLENBQWF0QyxZQUFiLEVBQTJCSyxTQUEzQixFQUFzQ3VCLElBQXRDLENBQTJDLElBQTNDLENBQXpDO0FBQ0Q7QUFFREQsYUFBUyxjQUFjdkMsS0FBSzZDLFNBQUwsQ0FBZUMsWUFBZixDQUFkLEdBQTZDLEdBQXREO0FBRUFMLFlBQVEsWUFBWXpDLEtBQUs2QyxTQUFMLENBQWVDLFlBQWYsQ0FBWixHQUEyQyxLQUFuRDtBQUVBUDtBQU1BO0FBQ0F4RCxPQUFHb0UsYUFBSCxDQUFpQnRELFNBQVMsWUFBMUIsRUFBd0M0QyxJQUF4QztBQUNEO0FBL0hENUQsUUFBQWMsYUFBQSxHQUFBQSxhQUFBO0FBcUlBOzs7Ozs7Ozs7OztBQWNBLFNBQUF5RCxrQkFBQSxDQUFtQ0MsQ0FBbkMsRUFBc0RoRCxRQUF0RCxFQUF3RWlELE1BQXhFLEVBQXNGO0FBRXBGLFFBQUlDLGVBQWV0RSxrQkFBQXVFLEtBQUEsQ0FBTUMscUJBQU4sQ0FBNEJKLENBQTVCLEVBQStCaEQsUUFBL0IsQ0FBbkI7QUFDQWpCLE1BQUVzRSxJQUFGLENBQU9ILFlBQVAsRUFBcUJELE1BQXJCO0FBQ0EsUUFBSXJCLE1BQU07QUFDUnNCLHNCQUFjQSxZQUROO0FBRVJJLDBCQUFrQixDQUZWO0FBR1JDLGtDQUEwQixDQUhsQjtBQUlSQyxtQkFBVyxDQUpIO0FBS1JDLDJCQUFtQixDQUxYO0FBTVJDLGdDQUF3QjtBQU5oQixLQUFWO0FBU0EsUUFBSUMsU0FBUyxFQUFiO0FBQ0EsUUFBSUMsaUJBQWlCLEVBQXJCO0FBQ0EsUUFBSUgsb0JBQW9CLENBQXhCO0FBQ0EsUUFBSUksaUJBQWlCYixFQUFFYyxPQUFGLENBQVU5QyxPQUFWLENBQWtCLFVBQVUrQyxNQUFWLEVBQWdCO0FBQ3JELFlBQUlBLE9BQU9DLE9BQVAsS0FBbUJmLE1BQXZCLEVBQStCO0FBQzdCckIsZ0JBQUk4QixzQkFBSixJQUE4QixDQUE5QjtBQUNEO0FBQ0QsWUFBSUssT0FBTy9ELFFBQVAsQ0FBSixFQUFzQjtBQUNwQixnQkFBSXZCLFFBQVFzRixPQUFPL0QsUUFBUCxDQUFaO0FBQ0EsZ0JBQUkrRCxPQUFPQyxPQUFQLEtBQW1CZixNQUF2QixFQUErQjtBQUM3QlcsK0JBQWVuRixLQUFmLElBQXdCLENBQUNtRixlQUFlbkYsS0FBZixLQUF5QixDQUExQixJQUErQixDQUF2RDtBQUNBbUQsb0JBQUk2QixpQkFBSixJQUF5QixDQUF6QjtBQUNEO0FBQ0RFLG1CQUFPbEYsS0FBUCxJQUFnQixDQUFDa0YsT0FBT2xGLEtBQVAsS0FBaUIsQ0FBbEIsSUFBdUIsQ0FBdkM7QUFDQW1ELGdCQUFJNEIsU0FBSixJQUFpQixDQUFqQjtBQUNEO0FBQ0YsS0Fib0IsQ0FBckI7QUFjQTVCLFFBQUkwQixnQkFBSixHQUF1QmhGLE9BQU8yRixJQUFQLENBQVlOLE1BQVosRUFBb0I3QixNQUEzQztBQUNBRixRQUFJMkIsd0JBQUosR0FBK0JqRixPQUFPMkYsSUFBUCxDQUFZTCxjQUFaLEVBQTRCOUIsTUFBM0Q7QUFDQSxXQUFPRixHQUFQO0FBQ0Q7QUFqQ0RwRCxRQUFBdUUsa0JBQUEsR0FBQUEsa0JBQUE7QUFtQ0EsU0FBQW1CLFdBQUEsQ0FBNEJqQixNQUE1QixFQUE0Q0QsQ0FBNUMsRUFBNkQ7QUFDM0Q7QUFDQSxRQUFJcEIsK0dBS0NxQixNQUxELFdBQUo7QUFPQTtBQUNBckI7QUFDQSxRQUFJN0IsT0FBT25CLGtCQUFBdUUsS0FBQSxDQUFNZ0Isc0JBQU4sQ0FBNkJuQixDQUE3QixFQUFnQ0MsTUFBaEMsQ0FBWDtBQUVBLFFBQUltQixrQkFBa0IsRUFBdEI7QUFDQSxRQUFJbEIsZUFBZSxFQUFuQjtBQUNBbkQsU0FBS2lCLE9BQUwsQ0FBYSxVQUFVWixHQUFWLEVBQWE7QUFDeEIsWUFBSWlFLFlBQVl0QixtQkFBbUJDLENBQW5CLEVBQXNCNUMsR0FBdEIsRUFBMkI2QyxNQUEzQixDQUFoQjtBQUNBbUIsd0JBQWdCaEUsR0FBaEIsSUFBdUJpRSxTQUF2QjtBQUNBbkIsdUJBQWVuRSxFQUFFMkIsS0FBRixDQUFRd0MsWUFBUixFQUFzQmtCLGdCQUFnQmhFLEdBQWhCLEVBQXFCa0UsWUFBM0MsQ0FBZjtBQUNBMUMsc0JBQVd4QixHQUFYLHNCQUE2QkEsR0FBN0IsV0FBc0NpRSxVQUFVZCx3QkFBaEQsbUJBQXNGYyxVQUFVWixpQkFBaEc7QUFDQSxZQUFJWSxVQUFVWixpQkFBVixLQUFnQ1ksVUFBVWIsU0FBOUMsRUFBeUQ7QUFDdkQ1Qiw0QkFBYXlDLFVBQVVmLGdCQUFWLEdBQTZCZSxVQUFVZCx3QkFBcEQsMkJBQWdHYyxVQUFVYixTQUFWLEdBQXNCYSxVQUFVWixpQkFBaEk7QUFDRCxTQUZELE1BRU87QUFDTDdCO0FBQ0Q7QUFDREE7QUFDRCxLQVhEO0FBYUE7QUFDQTtBQUNBQTtBQUNBc0IsaUJBQWFsQyxPQUFiLENBQXFCLFVBQVV1RCxXQUFWLEVBQXFCO0FBQ3hDM0Msc0JBQVcyQyxXQUFYO0FBQ0QsS0FGRDtBQUdBO0FBQ0EsUUFBSWYsWUFBWVIsRUFBRWMsT0FBRixDQUFVVSxNQUFWLENBQWlCLFVBQVVDLElBQVYsRUFBZ0JDLEtBQWhCLEVBQXFCO0FBQ3BELGVBQU9ELFFBQVNDLE1BQU1WLE9BQU4sS0FBa0JmLE1BQW5CLEdBQTZCLENBQTdCLEdBQWlDLENBQXpDLENBQVA7QUFDRCxLQUZlLEVBRWIsQ0FGYSxDQUFoQjtBQUdBckI7QUFDQUEsMkNBQWtDcUIsTUFBbEMsV0FBOENPLFNBQTlDO0FBRUE1QixvREFBMkM0QixTQUEzQztBQUVBNUI7QUFDQTdCLFNBQUtpQixPQUFMLENBQWEsVUFBVVosR0FBVixFQUFhO0FBQ3hCd0IsdUJBQVl4QixHQUFaLGdCQUF3QjZDLE1BQXhCO0FBQ0QsS0FGRDtBQUtBckI7QUFDQTdCLFNBQUtpQixPQUFMLENBQWEsVUFBVVosR0FBVixFQUFhO0FBQ3hCLFlBQUl1RSxNQUFNUCxnQkFBZ0JoRSxHQUFoQixDQUFWO0FBQ0F3Qix1QkFBWXhCLEdBQVo7QUFDRCxLQUhEO0FBTUE7QUFDQUwsU0FBS2lCLE9BQUwsQ0FBYSxVQUFVWixHQUFWLEVBQWEsQ0FHekIsQ0FIRDtBQUtBOzs7Ozs7Ozs7Ozs7QUFZQXdCO0FBQ0EsV0FBT0EsR0FBUDtBQUNEO0FBNUVEcEQsUUFBQTBGLFdBQUEsR0FBQUEsV0FBQTtBQTZFQTs7Ozs7Ozs7O0FBVUEsU0FBQVUsU0FBQSxDQUFtQkMsTUFBbkIsRUFBaUM7QUFDL0JBLGFBQVNBLE9BQU94RixPQUFQLENBQWUsS0FBZix5REFBVDtBQUtBLFdBQU93RixNQUFQO0FBQ0Q7QUFLRDs7O0FBR0EsU0FBQUMsU0FBQSxDQUEwQjdCLE1BQTFCLEVBQTBDRCxDQUExQyxFQUEyRDtBQUN6RDtBQUVBLFFBQUlqRCxPQUFPbkIsa0JBQUF1RSxLQUFBLENBQU1nQixzQkFBTixDQUE2Qm5CLENBQTdCLEVBQWdDQyxNQUFoQyxDQUFYO0FBQ0FsRCxXQUFPbkIsa0JBQUF1RSxLQUFBLENBQU00QiwwQkFBTixDQUFpQy9CLEVBQUVnQyxJQUFGLENBQU8vQixNQUFQLENBQWNBLE1BQWQsRUFBc0JnQyxVQUF0QixJQUFvQyxFQUFyRSxFQUF5RWxGLElBQXpFLENBQVA7QUFDQTtBQUNBLFFBQUltRixVQUFVcEcsU0FBU3FHLHdCQUFULENBQWtDcEYsS0FBSyxDQUFMLENBQWxDLEVBQTJDa0QsTUFBM0MsRUFBbURELENBQW5ELENBQWQ7QUFDQSxRQUFJcUIsWUFBWXRCLG1CQUFtQkMsQ0FBbkIsRUFBc0JqRCxLQUFLLENBQUwsQ0FBdEIsRUFBK0JrRCxNQUEvQixDQUFoQjtBQUVBLFFBQUltQyxjQUFjcEMsRUFBRWdDLElBQUYsQ0FBTy9CLE1BQVAsQ0FBY0EsTUFBZCxFQUFzQlosV0FBdEIsSUFBcUMsRUFBdkQ7QUFDQStDLGtCQUFjUixVQUFVUSxXQUFWLENBQWQ7QUFDQSxRQUFJeEQsMlVBWTZHcUIsTUFaN0csa1BBdUJTQSxNQXZCVCxrQ0F3QmVvQixVQUFVWCxzQkF4QnpCLGtDQTBCRzBCLFdBMUJILHFWQUFKO0FBNENBLFFBQUloQixrQkFBa0IsRUFBdEI7QUFDQSxRQUFJbEIsZUFBZSxFQUFuQjtBQUNBLFFBQUltQyxjQUFjckMsRUFBRWdDLElBQUYsQ0FBTy9CLE1BQVAsQ0FBY0EsTUFBZCxFQUFzQmdDLFVBQXRCLElBQW9DLEVBQXREO0FBQ0FsRixTQUFLaUIsT0FBTCxDQUFhLFVBQVVaLEdBQVYsRUFBYTtBQUN4QixZQUFJOEUsVUFBVXBHLFNBQVNxRyx3QkFBVCxDQUFrQy9FLEdBQWxDLEVBQXVDNkMsTUFBdkMsRUFBK0NELENBQS9DLENBQWQ7QUFDQTtBQUNBLFlBQUlxQixZQUFZdEIsbUJBQW1CQyxDQUFuQixFQUFzQjVDLEdBQXRCLEVBQTJCNkMsTUFBM0IsQ0FBaEI7QUFDQW1CLHdCQUFnQmhFLEdBQWhCLElBQXVCaUUsU0FBdkI7QUFDQW5CLHVCQUFlbkUsRUFBRTJCLEtBQUYsQ0FBUXdDLFlBQVIsRUFBc0JrQixnQkFBZ0JoRSxHQUFoQixFQUFxQmtFLFlBQTNDLENBQWY7QUFDQTs7Ozs7Ozs7O0FBU0E7QUFDQSxZQUFJdEIsRUFBRWdDLElBQUYsQ0FBTy9CLE1BQVAsQ0FBY0EsTUFBZCxFQUFzQmdDLFVBQXRCLENBQWlDN0UsR0FBakMsQ0FBSixFQUEyQztBQUV6QyxnQkFBSWtGLGlCQUFpQnpHLEtBQUswRyxjQUFMLENBQW9CTCxRQUFRTSxZQUFSLElBQXdCTixRQUFRTSxZQUFSLENBQXFCQyxRQUE3QyxJQUF5RFAsUUFBUU0sWUFBUixDQUFxQkMsUUFBOUUsSUFBMEYsRUFBOUcsS0FBcUgsUUFBMUk7QUFFQTdELDJEQUVjeEIsR0FGZCx1QkFHUzhFLFFBQVFRLGNBSGpCLDRCQUdzRFIsUUFBUVMsV0FIOUQseUdBT2VMLGNBUGYsK0RBU2VWLFVBQVVNLFFBQVFNLFlBQVIsSUFBd0JOLFFBQVFNLFlBQVIsQ0FBcUJuRCxXQUE3QyxJQUE0RCxFQUF0RSxDQVRmLGdFQVdldUMsVUFBVU0sUUFBUVUsWUFBbEIsQ0FYZjtBQWFEO0FBRUYsS0FuQ0Q7QUFxQ0EsUUFBSUMsWUFBWTlGLEtBQUsrQixNQUFMLEdBQWN4RCxPQUFPMkYsSUFBUCxDQUFZakIsRUFBRWdDLElBQUYsQ0FBTy9CLE1BQVAsQ0FBY0EsTUFBZCxFQUFzQmdDLFVBQWxDLEVBQThDbkQsTUFBNUU7QUFDQSxRQUFJZ0Usc0JBQXNCL0csRUFBRThELFVBQUYsQ0FBYTlDLElBQWIsRUFBbUJ6QixPQUFPMkYsSUFBUCxDQUFZakIsRUFBRWdDLElBQUYsQ0FBTy9CLE1BQVAsQ0FBY0EsTUFBZCxFQUFzQmdDLFVBQWxDLENBQW5CLENBQTFCO0FBQ0EsUUFBS1ksU0FBRCxHQUFjLENBQWxCLEVBQXFCO0FBQ25CakUsa0NBQ1VpRSxTQURWLGlDQUVJaEgsS0FBSzBHLGNBQUwsQ0FBb0JPLG1CQUFwQixDQUZKO0FBS0Q7QUFDRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBbUNBOzs7Ozs7Ozs7Ozs7QUFZQWxFO0FBVUEsV0FBT0EsR0FBUDtBQUNEO0FBbEtEcEQsUUFBQXNHLFNBQUEsR0FBQUEsU0FBQTtBQXNLQSxJQUFBaUIsa0JBQUFwSCxRQUFBLGVBQUEsQ0FBQTtBQUdBLFNBQUFxSCxPQUFBLENBQWlCQyxHQUFqQixFQUE0QjtBQUMxQkYsb0JBQUFHLElBQUEsQ0FBS0QsR0FBTCxFQUFVLFVBQVVFLEtBQVYsRUFBaUJDLE1BQWpCLEVBQXlCQyxNQUF6QixFQUErQjtBQUN2QyxZQUFJRixLQUFKLEVBQVc7QUFDVHhELG9CQUFRd0QsS0FBUixrQkFBNkJBLEtBQTdCO0FBQ0E7QUFDRDtBQUNEeEQsZ0JBQVFDLEdBQVIsY0FBdUJ3RCxNQUF2QjtBQUNBekQsZ0JBQVFDLEdBQVIsY0FBdUJ5RCxNQUF2QjtBQUNELEtBUEQ7QUFRRDtBQUFBO0FBRUQsU0FBQUMsU0FBQSxDQUEwQnRELENBQTFCLEVBQTZDdUQsU0FBN0MsRUFBOEQ7QUFDNUR2RCxNQUFFd0QsT0FBRixDQUFVeEYsT0FBVixDQUFrQixVQUFVeUYsT0FBVixFQUFpQjtBQUNqQyxZQUFJckgsSUFBSThFLFlBQVl1QyxPQUFaLEVBQXFCekQsQ0FBckIsQ0FBUjtBQUNBLFlBQUkwRCxVQUFVSCxZQUFZLEdBQVosR0FBa0JFLFFBQVFwSCxPQUFSLENBQWdCLElBQWhCLEVBQXNCLEdBQXRCLENBQWxCLEdBQStDLEtBQTdEO0FBQ0FYLFdBQUdvRSxhQUFILENBQWlCNEQsT0FBakIsRUFBMEJ0SCxDQUExQjtBQUNBLFlBQUl1SCxRQUFRQyxHQUFSLENBQVlDLFFBQWhCLEVBQTBCO0FBQ3hCbEUsb0JBQVFDLEdBQVIsQ0FBWSxtQkFBbUI4RCxPQUEvQjtBQUNBVixvQkFBUVcsUUFBUUMsR0FBUixDQUFZQyxRQUFaLEdBQXVCLGFBQXZCLEdBQXVDSCxPQUEvQztBQUNEO0FBQ0YsS0FSRDtBQVNEO0FBVkRsSSxRQUFBOEgsU0FBQSxHQUFBQSxTQUFBO0FBWUEsU0FBQVEsU0FBQSxDQUEwQjlELENBQTFCLEVBQTZDdUQsU0FBN0MsRUFBOEQ7QUFDNUR2RCxNQUFFd0QsT0FBRixDQUFVeEYsT0FBVixDQUFrQixVQUFVeUYsT0FBVixFQUFpQjtBQUNqQyxZQUFJckgsSUFBSTBGLFVBQVUyQixPQUFWLEVBQW1CekQsQ0FBbkIsQ0FBUjtBQUNBLFlBQUkwRCxVQUFVSCxZQUFZLEdBQVosR0FBa0JFLFFBQVFwSCxPQUFSLENBQWdCLElBQWhCLEVBQXNCLEdBQXRCLENBQWxCLEdBQStDLE9BQTdEO0FBQ0FKLGlCQUFTLG1CQUFtQnlILE9BQTVCO0FBQ0FoSSxXQUFHb0UsYUFBSCxDQUFpQjRELE9BQWpCLEVBQTBCdEgsQ0FBMUI7QUFDRCxLQUxEO0FBTUQ7QUFQRFosUUFBQXNJLFNBQUEsR0FBQUEsU0FBQSIsImZpbGUiOiJtb2RlbC92aXNtb2RlbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiB2aXN1YWxpemUgYSBtb2RlbCBhbmQgY2FsY3VsYXRlIHNvbWUgc3RhdGlzdGljc1xuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IGZkZXZzdGFfbW9ubW92ZV8xID0gcmVxdWlyZShcImZkZXZzdGFfbW9ubW92ZVwiKTtcbmNvbnN0IFV0aWwgPSByZXF1aXJlKFwiYWJvdF91dGlsc1wiKTtcbmNvbnN0IERlc2NyaWJlID0gcmVxdWlyZShcIi4uL21hdGNoL2Rlc2NyaWJlXCIpO1xuY29uc3QgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIik7XG5jb25zdCBkZWJ1ZyA9IHJlcXVpcmUoXCJkZWJ1Z1wiKTtcbi8vaW1wb3J0ICogYXMgZWxhc3RpY2x1bnIgZnJvbSAnZWxhc3RpY2x1bnInO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ3Zpc21vZGVsLnRzJyk7XG47XG52YXIgZWxhc3RpY2x1bnIgPSByZXF1aXJlKCdlbGFzdGljbHVucicpO1xuZnVuY3Rpb24gSlNPTkVzY2FwZShzKSB7XG4gICAgcmV0dXJuIHMucmVwbGFjZSgvXFxcXC9nLCBcIlxcXFxcXFxcXCIpLnJlcGxhY2UoL1xcbi9nLCBcIlxcXFxuXCIpXG4gICAgICAgIC5yZXBsYWNlKC9cXCcvZywgXCJcXFxcJ1wiKVxuICAgICAgICAucmVwbGFjZSgvXFxcIi9nLCAnXFxcXFwiJylcbiAgICAgICAgLnJlcGxhY2UoL1xcJi9nLCBcIlxcXFwmXCIpXG4gICAgICAgIC5yZXBsYWNlKC9cXHIvZywgXCJcXFxcclwiKVxuICAgICAgICAucmVwbGFjZSgvXFx0L2csIFwiXFxcXHRcIik7XG4gICAgLy8gLnJlcGxhY2UoL1xcYi9nLCBcIlxcXFxiXCIpXG4gICAgLy8gLnJlcGxhY2UoL1xcZi9nLCBcIlxcXFxmXCIpO1xufVxuZXhwb3J0cy5KU09ORXNjYXBlID0gSlNPTkVzY2FwZTtcbjtcbmZ1bmN0aW9uIG1ha2VMdW5ySW5kZXgobW9kZWxwYXRoLCBvdXRwdXQsIHNpbGVudCkge1xuICAgIHZhciBtZGwgPSBKU09OLnBhcnNlKCcnICsgZnMucmVhZEZpbGVTeW5jKG1vZGVscGF0aCArICcubW9kZWwuanNvbicpKTtcbiAgICB2YXIgZGF0YSA9IEpTT04ucGFyc2UoJycgKyBmcy5yZWFkRmlsZVN5bmMobW9kZWxwYXRoICsgJy5kYXRhLmpzb24nKSk7XG4gICAgdmFyIGNhdHMgPSBtZGwuY2F0ZWdvcnkuZmlsdGVyKGEgPT4gdHlwZW9mIGEgIT09ICdzdHJpbmcnKTtcbiAgICB2YXIgcWJlRGF0YU9iamVjdHMgPSBjYXRzLmZpbHRlcihjYXQgPT4gKGNhdC5RQkUgfHwgY2F0LlFCRUluY2x1ZGUpKTtcbiAgICAvL2NvbnNvbGUubG9nKFwiaGVyZSBjYXRzXCIgKyBKU09OLnN0cmluZ2lmeShjYXRzKSk7XG4gICAgLy9jb25zb2xlLmxvZyhcIlxcbmhlcmUgZGF0YSBvYmplY3RzXCIgKyBKU09OLnN0cmluZ2lmeShxYmVEYXRhT2JqZWN0cykpO1xuICAgIHZhciBxYmVEYXRhTmFtZXMgPSBxYmVEYXRhT2JqZWN0cy5tYXAoY2F0ID0+IGNhdC5uYW1lKTtcbiAgICBxYmVEYXRhTmFtZXMgPSBfLnVuaW9uKHFiZURhdGFOYW1lcywgbWRsLmNvbHVtbnMpO1xuICAgIHZhciBMVU5SSW5kZXggPSBjYXRzLmZpbHRlcihjYXQgPT4gY2F0LkxVTlJJbmRleCkubWFwKGNhdCA9PiBjYXQubmFtZSk7XG4gICAgLy92YXIgZWxhc3RpY2x1bnIgPSByZXF1aXJlKCdsdW5yJyk7XG4gICAgdmFyIGJvbWRhdGEgPSBkYXRhO1xuICAgIC8vIGluZGV4IGFsbCBMVU5SIHByb3BlcnRpZXNcbiAgICB2YXIgaW5kZXggPSBlbGFzdGljbHVucihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgTFVOUkluZGV4IC8qXG4gICAgICAgICAgICAgICAgW1wiYXBwSWRcIixcbiAgICAgICAgICAgICAgICBcIkFwcEtleVwiLFxuICAgICAgICAgICAgICAgIFwiQXBwTmFtZVwiLFxuICAgICAgICAgICAgICAgICAgICBcIkFwcGxpY2F0aW9uQ29tcG9uZW50XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiUm9sZU5hbWVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJBcHBsaWNhdGlvblR5cGVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJCU1BOYW1lXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiQlNQQXBwbGljYXRpb25VUkxcIixcbiAgICAgICAgICAgICAgICAgICAgXCJyZWxlYXNlTmFtZVwiLFxuICAgICAgICAgICAgICAgICAgICBcIkJ1c2luZXNzQ2F0YWxvZ1wiLFxuICAgICAgICAgICAgICAgICAgICBcIlRlY2huaWNhbENhdGFsb2dcIl0gKi9cbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uIChmaWVsZCkge1xuICAgICAgICAgICAgdGhhdC5hZGRGaWVsZChmaWVsZCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnNldFJlZignaWQnKTtcbiAgICAgICAgdGhpcy5zYXZlRG9jdW1lbnQoZmFsc2UpO1xuICAgIH0pO1xuICAgIGJvbWRhdGEuZm9yRWFjaChmdW5jdGlvbiAobywgaW5kZXgpIHtcbiAgICAgICAgby5pZCA9IGluZGV4O1xuICAgIH0pO1xuICAgIGJvbWRhdGEuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGluZGV4LmFkZERvYyhyZWNvcmQpO1xuICAgIH0pO1xuICAgIHZhciBlbGFzdGljID0gaW5kZXg7XG4gICAgLy8gZHVtcCB0aGUgbHVuciBpbmRleFxuICAgIC8vXG4gICAgdmFyIHRoZUluZGV4ID0gaW5kZXgudG9KU09OKCk7XG4gICAgdmFyIGNvbHVtbnMgPSBtZGwuY29sdW1ucy5tYXAoY29sbmFtZSA9PiB7XG4gICAgICAgIHZhciByZXMgPSBjYXRzLmZpbHRlcihjYXQgPT4gY2F0Lm5hbWUgPT09IGNvbG5hbWUpO1xuICAgICAgICBpZiAocmVzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5kZWZpbmVkIG9yIG5vbi1vYmplY3QgY29sdW1uIDogXCIgKyBjb2xuYW1lKTtcbiAgICAgICAgfVxuICAgICAgICA7XG4gICAgICAgIHJldHVybiByZXNbMF07XG4gICAgfSk7XG4gICAgdmFyIGNvbHVtbk5hbWVzID0gY29sdW1ucy5tYXAoY29sID0+IGNvbC5uYW1lKTtcbiAgICB2YXIganNvbnAgPSBgdmFyIG1kbGRhdGEgPSB7fTtcXG4vL2NvbHVtbnMgXFxuIG1kbGRhdGEuY29sdW1ucyA9IFtcIiR7Y29sdW1ucy5tYXAoY29sID0+IGNvbC5uYW1lKS5qb2luKCdcIixcIicpfVwiXTtgO1xuICAgIHZhciBqc29uID0gYHsgXCJjb2x1bW5zXCIgIDogW1wiJHtjb2x1bW5zLm1hcChjb2wgPT4gSlNPTkVzY2FwZShjb2wubmFtZSkpLmpvaW4oJ1wiLFwiJyl9XCJdLGA7XG4gICAgLy8ganNvbnAgKz0gYFxcbiBtZGxkYXRhLmZ1bGxkYXRhID0gJHtKU09OLnN0cmluZ2lmeShib21kYXRhKX07XFxuYDtcbiAgICAvL2pzb25wICs9IGBcXG4vL2NvbHVtbnMgaW5mbyBcXG4gbWRsZGF0YS5sdW5yY29sdW1ucyA9IFtcInske0xVTlJJbmRleC5qb2luKCdcIixcIicpfVwiXTtgO1xuICAgIGpzb25wICs9IGBcXG4vL2NvbHVtbnMgaW5mbyBcXG4gbWRsZGF0YS5jb2x1bW5zRGVzY3JpcHRpb24gPSB7JHtjb2x1bW5zLm1hcChjb2wgPT4gYCBcXG4gXCIke2NvbC5uYW1lfVwiIDogIFwiJHtKU09ORXNjYXBlKGNvbC5kZXNjcmlwdGlvbiB8fCBjb2wubmFtZSl9XCIgYCkuam9pbignLCcpfVxuICAgICAgfTtgO1xuICAgIGpzb24gKz0gYFwiY29sdW1uc0Rlc2NyaXB0aW9uXCIgOiB7JHtjb2x1bW5zLm1hcChjb2wgPT4gYCBcXG4gXCIke2NvbC5uYW1lfVwiIDogIFwiJHtKU09ORXNjYXBlKGNvbC5kZXNjcmlwdGlvbiB8fCBjb2wubmFtZSl9XCIgYCkuam9pbignLCcpfVxuICAgICAgfSxgO1xuICAgIGpzb25wICs9IGBcXG4vL2NvbHVtbnMgaW5mbyBcXG4gbWRsZGF0YS5jb2x1bW5zRGVmYXVsdFdpZHRoID0geyR7Y29sdW1ucy5tYXAoY29sID0+IGAgXFxuIFwiJHtjb2wubmFtZX1cIiA6ICR7Y29sLmRlZmF1bHRXaWR0aCB8fCAxNTB9IGApLmpvaW4oJywnKX1cbiAgICAgIH07YDtcbiAgICBqc29uICs9IGBcXG5cImNvbHVtbnNEZWZhdWx0V2lkdGhcIiA6IHske2NvbHVtbnMubWFwKGNvbCA9PiBgIFxcbiBcIiR7Y29sLm5hbWV9XCIgOiAke2NvbC5kZWZhdWx0V2lkdGggfHwgMTUwfSBgKS5qb2luKCcsJyl9XG4gICAgICB9LGA7XG4gICAgdmFyIHRoZUluZGV4U3RyID0gSlNPTi5zdHJpbmdpZnkodGhlSW5kZXgpO1xuICAgIGpzb25wICs9IFwiXFxudmFyIHNlckluZGV4ID1cXFwiXCIgKyBKU09ORXNjYXBlKHRoZUluZGV4U3RyKSArIFwiXFxcIjtcXG5cIjtcbiAgICAvLyBqc29ucCArPSBcIlxcbnZhciBzZXJJbmRleCA9XCIgKyBKU09OLnN0cmluZ2lmeSh0aGVJbmRleCkgKyBcIjtcXG5cIjtcbiAgICBqc29uICs9ICdcXG5cInNlckluZGV4XCIgOicgKyB0aGVJbmRleFN0ciArICcsJztcbiAgICAvL2NvbnNvbGUubG9nKFwiaGVyZSBhbGwgbmFtZXMgXCIgKyBKU09OLnN0cmluZ2lmeShxYmVEYXRhTmFtZXMpKTtcbiAgICB2YXIgY2xlYW5zZWRkYXRhID0gYm9tZGF0YS5tYXAobyA9PiB7XG4gICAgICAgIHZhciByZXMgPSB7fTtcbiAgICAgICAgcWJlRGF0YU5hbWVzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIHJlc1trZXldID0gb1trZXldO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9KTtcbiAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImR1bXBpbmcgXCIgKyBvdXRwdXQpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImxlbmd0aCBvZiBpbmRleCBzdHJcIiArIHRoZUluZGV4U3RyLmxlbmd0aCk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYXZhaWxhYmxlICAgICAgICAgIFwiICsgY29sdW1ucy5sZW5ndGggKyBcIiBjb2x1bW5zXCIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcInJldHVybmluZyBhcyBkYXRhICBcIiArIHFiZURhdGFOYW1lcy5sZW5ndGggKyBcIiBjb2x1bW5zXCIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImluZGV4aW5nICAgICAgICAgICBcIiArIExVTlJJbmRleC5sZW5ndGggKyBcIiBjb2x1bW5zXCIpO1xuICAgICAgICBjb25zb2xlLmxvZygncmV0dXJuZWQgYnV0IG5vdCBhdmFpbGFibGUnLCBfLmRpZmZlcmVuY2UocWJlRGF0YU5hbWVzLCBjb2x1bW5OYW1lcykuam9pbihcIiwgXCIpKTtcbiAgICAgICAgY29uc29sZS5sb2coJ3JldHVybmVkIGJ1dCBub3QgaW5kZXhlZCcsIF8uZGlmZmVyZW5jZShxYmVEYXRhTmFtZXMsIExVTlJJbmRleCkuam9pbihcIiwgXCIpKTtcbiAgICB9XG4gICAganNvbnAgKz0gXCJ2YXIgZGF0YT1cIiArIEpTT04uc3RyaW5naWZ5KGNsZWFuc2VkZGF0YSkgKyBcIjtcIjtcbiAgICBqc29uICs9ICdcImRhdGFcIjonICsgSlNPTi5zdHJpbmdpZnkoY2xlYW5zZWRkYXRhKSArIFwiXFxufVwiO1xuICAgIGpzb25wICs9IGBcblxuICAgICAgICAgICAvLyB2YXIgZWxhc3RpYyA9IGVsYXN0aWNsdW5yLkluZGV4LmxvYWQoc2VySW5kZXgpO1xuXG4gIGA7XG4gICAgLy9mcy53cml0ZUZpbGVTeW5jKG91dHB1dCArIFwiLmx1bnIuanNcIiwganNvbnApO1xuICAgIGZzLndyaXRlRmlsZVN5bmMob3V0cHV0ICsgXCIubHVuci5qc29uXCIsIGpzb24pO1xufVxuZXhwb3J0cy5tYWtlTHVuckluZGV4ID0gbWFrZUx1bnJJbmRleDtcbi8qXG5cclxuICB2YXIgaW5kZXggPSBlbGFzdGlsdW5yLkluZGV4LmxvYWQob2JqKTtcblxyXG5cclxufVxuXHJcbiBcIlFCRVwiIDogZmFsc2UsXG4gICAgICBcIlFCRUluY2x1ZGVcIiA6IHRydWUsXG4gICAgICBcIkxVTlJJbmRleFwiOiBmYWxzZVxuKi9cbmZ1bmN0aW9uIGNhbGNDYXRlZ29yeVJlY29yZChtLCBjYXRlZ29yeSwgZG9tYWluKSB7XG4gICAgdmFyIG90aGVyZG9tYWlucyA9IGZkZXZzdGFfbW9ubW92ZV8xLk1vZGVsLmdldERvbWFpbnNGb3JDYXRlZ29yeShtLCBjYXRlZ29yeSk7XG4gICAgXy5wdWxsKG90aGVyZG9tYWlucywgZG9tYWluKTtcbiAgICB2YXIgcmVzID0ge1xuICAgICAgICBvdGhlcmRvbWFpbnM6IG90aGVyZG9tYWlucyxcbiAgICAgICAgbnJEaXN0aW5jdFZhbHVlczogMCxcbiAgICAgICAgbnJEaXN0aW5jdFZhbHVlc0luRG9tYWluOiAwLFxuICAgICAgICBuclJlY29yZHM6IDAsXG4gICAgICAgIG5yUmVjb3Jkc0luRG9tYWluOiAwLFxuICAgICAgICBuclRvdGFsUmVjb3Jkc0luRG9tYWluOiAwLFxuICAgIH07XG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgIHZhciB2YWx1ZXNJbkRvbWFpbiA9IFtdO1xuICAgIHZhciBuclJlY29yZHNJbkRvbWFpbiA9IDA7XG4gICAgdmFyIGRpc3RpbmN0VmFsdWVzID0gbS5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKG9FbnRyeSkge1xuICAgICAgICBpZiAob0VudHJ5Ll9kb21haW4gPT09IGRvbWFpbikge1xuICAgICAgICAgICAgcmVzLm5yVG90YWxSZWNvcmRzSW5Eb21haW4gKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob0VudHJ5W2NhdGVnb3J5XSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gb0VudHJ5W2NhdGVnb3J5XTtcbiAgICAgICAgICAgIGlmIChvRW50cnkuX2RvbWFpbiA9PT0gZG9tYWluKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzSW5Eb21haW5bdmFsdWVdID0gKHZhbHVlc0luRG9tYWluW3ZhbHVlXSB8fCAwKSArIDE7XG4gICAgICAgICAgICAgICAgcmVzLm5yUmVjb3Jkc0luRG9tYWluICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZXNbdmFsdWVdID0gKHZhbHVlc1t2YWx1ZV0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgcmVzLm5yUmVjb3JkcyArPSAxO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmVzLm5yRGlzdGluY3RWYWx1ZXMgPSBPYmplY3Qua2V5cyh2YWx1ZXMpLmxlbmd0aDtcbiAgICByZXMubnJEaXN0aW5jdFZhbHVlc0luRG9tYWluID0gT2JqZWN0LmtleXModmFsdWVzSW5Eb21haW4pLmxlbmd0aDtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jYWxjQ2F0ZWdvcnlSZWNvcmQgPSBjYWxjQ2F0ZWdvcnlSZWNvcmQ7XG5mdW5jdGlvbiBncmFwaERvbWFpbihkb21haW4sIG0pIHtcbiAgICAvLyBkcmF3IGEgbW9kZWwgZG9tYWluc1xuICAgIHZhciByZXMgPSBgXG4gICAgZGlncmFwaCBzZHN1IHtcblx0c2l6ZT1cIjM2LDM2XCI7XG4gICByYW5rZGlyPUxSXG5cdG5vZGUgW2NvbG9yPXllbGxvdywgc3R5bGU9ZmlsbGVkXTtcbiAgICBcIiR7ZG9tYWlufVwiXG4gIGA7XG4gICAgLy8gYWRkIGFsbCBjYXRlZ29yeSBub2Rlc1xuICAgIHJlcyArPSBgbm9kZSBbc2hhcGU9cmVjb3JkLCBjb2xvcj15ZWxsb3csIHN0eWxlPWZpbGxlZF07XFxuIGA7XG4gICAgdmFyIGNhdHMgPSBmZGV2c3RhX21vbm1vdmVfMS5Nb2RlbC5nZXRDYXRlZ29yaWVzRm9yRG9tYWluKG0sIGRvbWFpbik7XG4gICAgdmFyIGNhdGVnb3J5UmVzdWx0cyA9IHt9O1xuICAgIHZhciBvdGhlcmRvbWFpbnMgPSBbXTtcbiAgICBjYXRzLmZvckVhY2goZnVuY3Rpb24gKGNhdCkge1xuICAgICAgICB2YXIgY2F0UmVzdWx0ID0gY2FsY0NhdGVnb3J5UmVjb3JkKG0sIGNhdCwgZG9tYWluKTtcbiAgICAgICAgY2F0ZWdvcnlSZXN1bHRzW2NhdF0gPSBjYXRSZXN1bHQ7XG4gICAgICAgIG90aGVyZG9tYWlucyA9IF8udW5pb24ob3RoZXJkb21haW5zLCBjYXRlZ29yeVJlc3VsdHNbY2F0XS5vdGhlckRvbWFpbnMpO1xuICAgICAgICByZXMgKz0gYFwiJHtjYXR9XCIgW2xhYmVsPVwieyAke2NhdH0gfCAke2NhdFJlc3VsdC5uckRpc3RpbmN0VmFsdWVzSW5Eb21haW59IFZhbHVlcyBpbiAke2NhdFJlc3VsdC5uclJlY29yZHNJbkRvbWFpbn0gYDtcbiAgICAgICAgaWYgKGNhdFJlc3VsdC5uclJlY29yZHNJbkRvbWFpbiAhPT0gY2F0UmVzdWx0Lm5yUmVjb3Jkcykge1xuICAgICAgICAgICAgcmVzICs9IGB8ICAke2NhdFJlc3VsdC5uckRpc3RpbmN0VmFsdWVzIC0gY2F0UmVzdWx0Lm5yRGlzdGluY3RWYWx1ZXNJbkRvbWFpbn0gb3RoZXIgdmFsdWVzIGluICR7Y2F0UmVzdWx0Lm5yUmVjb3JkcyAtIGNhdFJlc3VsdC5uclJlY29yZHNJbkRvbWFpbn0gb3RoZXIgcmVjb3Jkc2A7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXMgKz0gYCBgO1xuICAgICAgICB9XG4gICAgICAgIHJlcyArPSBgfVwiXVxcbmA7XG4gICAgfSk7XG4gICAgLy8gY2FsY3VsYXRlIG90aGVyIGRvbWFpbnMuXG4gICAgLy8gZHJhdyBcIm90aGVyIGNhdGVnb3JpZXNcIlxuICAgIHJlcyArPSBgbm9kZSBbY29sb3I9cHVycGxlLCBzdHlsZT1maWxsZWRdOyBcXG5gO1xuICAgIG90aGVyZG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uIChvdGhlcmRvbWFpbikge1xuICAgICAgICByZXMgKz0gYFwiJHtvdGhlcmRvbWFpbn1cIiBcXG5gO1xuICAgIH0pO1xuICAgIC8vIGNvdW50IHJlY29yZHMgaW4gZG9tYWluIDpcbiAgICB2YXIgbnJSZWNvcmRzID0gbS5yZWNvcmRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgZW50cnkpIHtcbiAgICAgICAgcmV0dXJuIHByZXYgKyAoKGVudHJ5Ll9kb21haW4gPT09IGRvbWFpbikgPyAxIDogMCk7XG4gICAgfSwgMCk7XG4gICAgcmVzICs9IGBub2RlIFtzaGFwZT1yZWNvcmRdOyBcXG5gO1xuICAgIHJlcyArPSBgIFwicmVjb3JkXCIgW2xhYmVsPVwiezxmMD4gJHtkb21haW59IHwgJHtuclJlY29yZHN9fVwiXSBcXG5gO1xuICAgIHJlcyArPSBgIFwicl9vdGhlclwiIFtsYWJlbD1cIns8ZjA+IG90aGVyIHwgJHtuclJlY29yZHN9fVwiXSBcXG4gYDtcbiAgICByZXMgKz0gYCMgcmVsYXRpb24gZnJvbSBjYXRlZ29yaWVzIHRvIGRvbWFpblxcbmA7XG4gICAgY2F0cy5mb3JFYWNoKGZ1bmN0aW9uIChjYXQpIHtcbiAgICAgICAgcmVzICs9IGAgXCIke2NhdH1cIiAtPiBcIiR7ZG9tYWlufVwiIFxcbmA7XG4gICAgfSk7XG4gICAgcmVzICs9IGAjIHJlbGF0aW9uIGZyb20gY2F0ZWdvcmllcyB0byByZWNvcmRzXFxuYDtcbiAgICBjYXRzLmZvckVhY2goZnVuY3Rpb24gKGNhdCkge1xuICAgICAgICB2YXIgcmVjID0gY2F0ZWdvcnlSZXN1bHRzW2NhdF07XG4gICAgICAgIHJlcyArPSBgIFwiJHtjYXR9XCIgLT4gXCJyZWNvcmRcIiBcXG5gO1xuICAgIH0pO1xuICAgIC8vb3RoZXIgZG9tYWlucyB0byB0aGlzXG4gICAgY2F0cy5mb3JFYWNoKGZ1bmN0aW9uIChjYXQpIHtcbiAgICB9KTtcbiAgICAvKlxuICAgIGNhdHMgZm9cbiAgICAgIGRpZ3JhcGggc2RzdSB7XG4gICAgICBzaXplPVwiMzYsMzZcIjtcbiAgICAgIG5vZGUgW2NvbG9yPXllbGxvdywgc3R5bGU9ZmlsbGVkXTtcbiAgICAgIEZMUEQgRkxQIFwiQk9NIEVkaXRvclwiLCBcIldJS0lVUkxcIiBcIlVJNSBEb2N1bWVudGF0aW9uXCIsIFwiVUk1IEV4YW1wbGVcIiwgXCJTVEFSVFRBXCJcbiAgICAgIEJDUFxuICAgICAgbm9kZSBbY29sb3I9Z3JleSwgc3R5bGU9ZmlsbGVkXTtcbiAgICAgIG5vZGUgW2ZvbnRuYW1lPVwiVmVyZGFuYVwiLCBzaXplPVwiMzAsMzBcIl07XG4gICAgICBub2RlIFtjb2xvcj1ncmV5LCBzdHlsZT1maWxsZWRdO1xuICAgICAgZ3JhcGggWyBmb250bmFtZSA9IFwiQXJpYWxcIixcbiAgICAqL1xuICAgIHJlcyArPSBgfVxcbmA7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZ3JhcGhEb21haW4gPSBncmFwaERvbWFpbjtcbi8qXG4gICAgY2F0ZWdvcnlEZXNjIDogdGhlTW9kZWwuZnVsbC5kb21haW5bZmlsdGVyZG9tYWluXS5jYXRlZ29yaWVzW2NhdGVnb3J5XSxcbiAgICBkaXN0aW5jdCA6IGRpc3RpbmN0LFxuICAgIGRlbHRhIDogZGVsdGEsXG4gICAgcHJlc2VudFJlY29yZHMgOiByZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyxcbiAgICBwZXJjUHJlc2VudCA6IHBlcmNlbnQsXG4gICAgc2FtcGxlVmFsdWVzIDogdmFsdWVzTGlzdFxuICB9XG4qL1xuZnVuY3Rpb24gcmVwbGFjZUJyKHN0cmluZykge1xuICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKC9cXG4vZywgYFxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0YnJcblxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdHwgYCk7XG4gICAgcmV0dXJuIHN0cmluZztcbn1cbi8qKlxuICogZ2VuZXJhdGUgYSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIGEgZG9tYWluXG4gKi9cbmZ1bmN0aW9uIHRhYkRvbWFpbihkb21haW4sIG0pIHtcbiAgICAvLyBkcmF3IGEgbW9kZWwgZG9tYWluc1xuICAgIHZhciBjYXRzID0gZmRldnN0YV9tb25tb3ZlXzEuTW9kZWwuZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbihtLCBkb21haW4pO1xuICAgIGNhdHMgPSBmZGV2c3RhX21vbm1vdmVfMS5Nb2RlbC5zb3J0Q2F0ZWdvcmllc0J5SW1wb3J0YW5jZShtLmZ1bGwuZG9tYWluW2RvbWFpbl0uY2F0ZWdvcmllcyB8fCB7fSwgY2F0cyk7XG4gICAgLy9jb25zb2xlLmxvZyhjYXRzLmpvaW4oXCJcXG5cIikpO1xuICAgIHZhciBjYXRkZXNjID0gRGVzY3JpYmUuZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluKGNhdHNbMF0sIGRvbWFpbiwgbSk7XG4gICAgdmFyIGNhdFJlc3VsdCA9IGNhbGNDYXRlZ29yeVJlY29yZChtLCBjYXRzWzBdLCBkb21haW4pO1xuICAgIHZhciBkb21haW5EZXNjciA9IG0uZnVsbC5kb21haW5bZG9tYWluXS5kZXNjcmlwdGlvbiB8fCBcIlwiO1xuICAgIGRvbWFpbkRlc2NyID0gcmVwbGFjZUJyKGRvbWFpbkRlc2NyKTtcbiAgICB2YXIgcmVzID0gYFxuXG4vLyBwcmVzZXQgZm9ybSB2YWx1ZXMgaWYgd2UgcmVjZWl2ZSBhIHVzZXJkYXRhIG9iamVjdCAvL1xuLSB1c2VyID0gdXNlclxuXG5leHRlbmRzIC4uL2xheW91dF9wXG5cbmJsb2NrIGNvbnRlbnRcblxuXHRuYXYubmF2YmFyLm5hdmJhci1kZWZhdWx0Lm5hdmJhci1maXhlZC10b3Bcblx0XHQuY29udGFpbmVyXG5cdFx0XHQubmF2YmFyLWhlYWRlclxuXHRcdFx0XHQubmF2YmFyLWJyYW5kKHN0eWxlPSdiZ2NvbG9yOm9yYW5nZTtjb2xvcjpkYXJrYmx1ZTtmb250LWZhbWlseTpBcmlhbCBCbGFjaztmb250LXNpemU6MTUuMTE4cHgnKSB3b3NhcCBkb21haW4gJHtkb21haW59XG5cdFx0XHR1bC5uYXYubmF2YmFyLW5hdi5uYXZiYXItcmlnaHQgI3t1aWR9XG5cdFx0XHRcdGxpXG5cdFx0XHRcdFx0Lm5hdmJhci1idG4jYnRuLWxvZ291dC5idG4uYnRuLWRlZmF1bHQob25jbGljaz1cImxvY2F0aW9uLmhyZWY9Jy9ob21lJ1wiKVxuXHRcdFx0XHRcdFx0fCBiYWNrIHRvIGhvbWVcblxuXHRwICAmbmJzcDtcblx0cCAmbmJzcDtcblx0cFxuXG5cdGRpdi53ZWxsXG5cdFx0aDMgZG9tYWluIFwiJHtkb21haW59XCJcblx0XHRcdHNwYW4ucHVsbC1yaWdodCAke2NhdFJlc3VsdC5uclRvdGFsUmVjb3Jkc0luRG9tYWlufSByZWNvcmRzXG5cdFx0cFxuXHRcdHNwYW4gJHtkb21haW5EZXNjcn1cblxuXHRcdHRhYmxlLnRhYmxlLnRhYmxlLWNvbmRlbnNlZC50YWJsZS1zdHJpcGVkXG5cdFx0XHR0aGVhZFxuXHRcdFx0XHR0clxuXHRcdFx0XHRcdHRoIGNhdGVnb3J5XG5cdFx0XHRcdFx0dGgoc3R5bGU9XCJ3aWR0aDoxMCVcIikgY291bnRcblx0XHRcdFx0XHR0aFxuXHRcdFx0XHRcdFx0dGFibGVcblx0XHRcdFx0XHRcdFx0dHJcblx0XHRcdFx0XHRcdFx0XHR0ZCBzeW5vbnltc1xuXHRcdFx0XHRcdFx0XHR0clxuXHRcdFx0XHRcdFx0XHRcdHRkIGRlc2NyaXB0aW9uXG5cdFx0XHRcdFx0XHRcdHRyXG5cdFx0XHRcdFx0XHRcdFx0dGQgZXhhbXBsZSB2YWx1ZXNcblx0XHRcdHRib2R5XG5gO1xuICAgIHZhciBjYXRlZ29yeVJlc3VsdHMgPSB7fTtcbiAgICB2YXIgb3RoZXJkb21haW5zID0gW107XG4gICAgdmFyIGNhdGVnb3J5TWFwID0gbS5mdWxsLmRvbWFpbltkb21haW5dLmNhdGVnb3JpZXMgfHwge307XG4gICAgY2F0cy5mb3JFYWNoKGZ1bmN0aW9uIChjYXQpIHtcbiAgICAgICAgdmFyIGNhdGRlc2MgPSBEZXNjcmliZS5nZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0LCBkb21haW4sIG0pO1xuICAgICAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGNhdGRlc2MpKTtcbiAgICAgICAgdmFyIGNhdFJlc3VsdCA9IGNhbGNDYXRlZ29yeVJlY29yZChtLCBjYXQsIGRvbWFpbik7XG4gICAgICAgIGNhdGVnb3J5UmVzdWx0c1tjYXRdID0gY2F0UmVzdWx0O1xuICAgICAgICBvdGhlcmRvbWFpbnMgPSBfLnVuaW9uKG90aGVyZG9tYWlucywgY2F0ZWdvcnlSZXN1bHRzW2NhdF0ub3RoZXJEb21haW5zKTtcbiAgICAgICAgLypcbiAgICAgICAgICAgIHJlcyArPSBgXCIke2NhdH1cIiBbbGFiZWw9XCJ7ICR7Y2F0fSB8ICR7Y2F0UmVzdWx0Lm5yRGlzdGluY3RWYWx1ZXNJbkRvbWFpbn0gVmFsdWVzIGluICR7Y2F0UmVzdWx0Lm5yUmVjb3Jkc0luRG9tYWlufSBgO1xuICAgICAgICAgICAgaWYoY2F0UmVzdWx0Lm5yUmVjb3Jkc0luRG9tYWluICE9PSBjYXRSZXN1bHQubnJSZWNvcmRzKSB7XG4gICAgICAgICAgICAgIHJlcyArPSAgYHwgICR7Y2F0UmVzdWx0Lm5yRGlzdGluY3RWYWx1ZXMgLSBjYXRSZXN1bHQubnJEaXN0aW5jdFZhbHVlc0luRG9tYWlufSBvdGhlciB2YWx1ZXMgaW4gJHtjYXRSZXN1bHQubnJSZWNvcmRzIC0gY2F0UmVzdWx0Lm5yUmVjb3Jkc0luRG9tYWlufSBvdGhlciByZWNvcmRzYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlcyArPSBgIGA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMgKz0gYH1cIl1cXG5gO1xuICAgICAgICAqL1xuICAgICAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KG0uZnVsbC5kb21haW5bZG9tYWluXSkpO1xuICAgICAgICBpZiAobS5mdWxsLmRvbWFpbltkb21haW5dLmNhdGVnb3JpZXNbY2F0XSkge1xuICAgICAgICAgICAgdmFyIHN5bm9ueW1zU3RyaW5nID0gVXRpbC5saXN0VG9Db21tYUFuZChjYXRkZXNjLmNhdGVnb3J5RGVzYyAmJiBjYXRkZXNjLmNhdGVnb3J5RGVzYy5zeW5vbnltcyAmJiBjYXRkZXNjLmNhdGVnb3J5RGVzYy5zeW5vbnltcyB8fCBbXSkgfHwgXCImbmJzcDtcIjtcbiAgICAgICAgICAgIHJlcyArPSBgXG5cdFx0XHR0clxuXHRcdFx0XHRcdHRkLmNhdF9jb3VudCAke2NhdH1cblxcdFxcdFxcdFxcdFxcdHRkICR7Y2F0ZGVzYy5wcmVzZW50UmVjb3Jkc30gZGlzdGluY3QgdmFsdWVzIGluICR7Y2F0ZGVzYy5wZXJjUHJlc2VudH0lIG9mIHJlY29yZHNcblxcdFxcdFxcdFxcdFxcdHRkXG5cXHRcXHRcXHRcXHRcXHRcXHR0YWJsZVxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0dHIuY2F0X3N5bm9ueW1zXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHR0ZCAke3N5bm9ueW1zU3RyaW5nfVxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0dHIuY2F0X2Rlc2NyaXB0aW9uXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHR0ZCAke3JlcGxhY2VCcihjYXRkZXNjLmNhdGVnb3J5RGVzYyAmJiBjYXRkZXNjLmNhdGVnb3J5RGVzYy5kZXNjcmlwdGlvbiB8fCBcIlwiKX1cblxcdFxcdFxcdFxcdFxcdFxcdFxcdHRyLmNhdF9zYW1wbGV2YWx1ZXNcblxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdHRkICR7cmVwbGFjZUJyKGNhdGRlc2Muc2FtcGxlVmFsdWVzKX1cbiAgICAgIGA7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgb3RoZXJjYXRzID0gY2F0cy5sZW5ndGggLSBPYmplY3Qua2V5cyhtLmZ1bGwuZG9tYWluW2RvbWFpbl0uY2F0ZWdvcmllcykubGVuZ3RoO1xuICAgIHZhciByZW1haW5pbmdDYXRlZ29yaWVzID0gXy5kaWZmZXJlbmNlKGNhdHMsIE9iamVjdC5rZXlzKG0uZnVsbC5kb21haW5bZG9tYWluXS5jYXRlZ29yaWVzKSk7XG4gICAgaWYgKChvdGhlcmNhdHMpID4gMCkge1xuICAgICAgICByZXMgKz0gYFxuXFx0XFx0cCAgIGFuZCAke290aGVyY2F0c30gb3RoZXIgY2F0ZWdvcmllc1xuXFx0XFx0fCAke1V0aWwubGlzdFRvQ29tbWFBbmQocmVtYWluaW5nQ2F0ZWdvcmllcyl9XG4gICAgICAgYDtcbiAgICB9XG4gICAgLypcbiAgICAgIC8vIGNhbGN1bGF0ZSBvdGhlciBkb21haW5zLlxuICAgICAgLy8gZHJhdyBcIm90aGVyIGNhdGVnb3JpZXNcIlxuICAgICAgcmVzICs9IGBub2RlIFtjb2xvcj1wdXJwbGUsIHN0eWxlPWZpbGxlZF07IFxcbmBcbiAgICAgIG90aGVyZG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uKG90aGVyZG9tYWluKSB7XG4gICAgICAgIHJlcyArPSBgXCIke290aGVyZG9tYWlufVwiIFxcbmA7XG4gICAgICB9KTtcbiAgICAgIC8vIGNvdW50IHJlY29yZHMgaW4gZG9tYWluIDpcbiAgICAgIHZhciBuclJlY29yZHMgPSBtLnJlY29yZHMucmVkdWNlKGZ1bmN0aW9uKHByZXYsZW50cnkpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgKChlbnRyeS5fZG9tYWluID09PSBkb21haW4pID8gMSA6IDApO1xuICAgICAgfSwwKTtcbiAgICAgIHJlcyArPSBgbm9kZSBbc2hhcGU9cmVjb3JkXTsgXFxuYFxuICAgICAgcmVzICs9IGAgXCJyZWNvcmRcIiBbbGFiZWw9XCJ7PGYwPiAke2RvbWFpbn0gfCAke25yUmVjb3Jkc319XCJdIFxcbmA7XG4gIFxyXG4gICAgICByZXMgKz0gYCBcInJfb3RoZXJcIiBbbGFiZWw9XCJ7PGYwPiBvdGhlciB8ICR7bnJSZWNvcmRzfX1cIl0gXFxuIGA7XG4gIFxyXG4gICAgICByZXMgKz0gYCMgcmVsYXRpb24gZnJvbSBjYXRlZ29yaWVzIHRvIGRvbWFpblxcbmA7XG4gICAgICBjYXRzLmZvckVhY2goZnVuY3Rpb24oY2F0KSB7XG4gICAgICAgIHJlcyArPSBgIFwiJHtjYXR9XCIgLT4gXCIke2RvbWFpbn1cIiBcXG5gO1xuICAgICAgfSlcbiAgXHJcbiAgXHJcbiAgICAgIHJlcyArPSBgIyByZWxhdGlvbiBmcm9tIGNhdGVnb3JpZXMgdG8gcmVjb3Jkc1xcbmA7XG4gICAgICBjYXRzLmZvckVhY2goZnVuY3Rpb24oY2F0KSB7XG4gICAgICAgIHZhciByZWMgPSBjYXRlZ29yeVJlc3VsdHNbY2F0XTtcbiAgICAgICAgcmVzICs9IGAgXCIke2NhdH1cIiAtPiBcInJlY29yZFwiIFxcbmA7XG4gICAgICB9KVxuICBcclxuICBcclxuICAgICAgLy9vdGhlciBkb21haW5zIHRvIHRoaXNcbiAgICAgIGNhdHMuZm9yRWFjaChmdW5jdGlvbihjYXQpIHtcbiAgXHJcbiAgXHJcbiAgICAgIH0pXG4gICAgKi9cbiAgICAvKlxuICAgIGNhdHMgZm9cbiAgICAgIGRpZ3JhcGggc2RzdSB7XG4gICAgICBzaXplPVwiMzYsMzZcIjtcbiAgICAgIG5vZGUgW2NvbG9yPXllbGxvdywgc3R5bGU9ZmlsbGVkXTtcbiAgICAgIEZMUEQgRkxQIFwiQk9NIEVkaXRvclwiLCBcIldJS0lVUkxcIiBcIlVJNSBEb2N1bWVudGF0aW9uXCIsIFwiVUk1IEV4YW1wbGVcIiwgXCJTVEFSVFRBXCJcbiAgICAgIEJDUFxuICAgICAgbm9kZSBbY29sb3I9Z3JleSwgc3R5bGU9ZmlsbGVkXTtcbiAgICAgIG5vZGUgW2ZvbnRuYW1lPVwiVmVyZGFuYVwiLCBzaXplPVwiMzAsMzBcIl07XG4gICAgICBub2RlIFtjb2xvcj1ncmV5LCBzdHlsZT1maWxsZWRdO1xuICAgICAgZ3JhcGggWyBmb250bmFtZSA9IFwiQXJpYWxcIixcbiAgICAqL1xuICAgIHJlcyArPSBgXG5cdFx0aDMgVmVyc2lvblxuXHRcdFx0YS5zbWFsbChocmVmPVwiL3doYXRzbmV3XCIpXG5cblxuYmxvY2sgc2NyaXB0c1xuXHRzY3JpcHQoc3JjPScvdmVuZG9yL2pxdWVyeS0yLjIuMy5taW4uanMnKVxuXHRzY3JpcHQoc3JjPScvdmVuZG9yL2Jvb3RzdHJhcC5taW4uanMnKVxuXHRzY3JpcHQoc3JjPScvanMvdmlld3Mvc2V0dGluZ3MuanMnKVxuYDtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy50YWJEb21haW4gPSB0YWJEb21haW47XG5jb25zdCBjaGlsZF9wcm9jZXNzXzEgPSByZXF1aXJlKFwiY2hpbGRfcHJvY2Vzc1wiKTtcbmZ1bmN0aW9uIGV4ZWNDbWQoY21kKSB7XG4gICAgY2hpbGRfcHJvY2Vzc18xLmV4ZWMoY21kLCBmdW5jdGlvbiAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgZXhlYyBlcnJvcjogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhgc3Rkb3V0OiAke3N0ZG91dH1gKTtcbiAgICAgICAgY29uc29sZS5sb2coYHN0ZGVycjogJHtzdGRlcnJ9YCk7XG4gICAgfSk7XG59XG47XG5mdW5jdGlvbiB2aXNNb2RlbHMobSwgZm9sZGVyT3V0KSB7XG4gICAgbS5kb21haW5zLmZvckVhY2goZnVuY3Rpb24gKHNEb21haW4pIHtcbiAgICAgICAgdmFyIHMgPSBncmFwaERvbWFpbihzRG9tYWluLCBtKTtcbiAgICAgICAgdmFyIGZuR3JhcGggPSBmb2xkZXJPdXQgKyBcIi9cIiArIHNEb21haW4ucmVwbGFjZSgvIC9nLCAnXycpICsgXCIuZ3ZcIjtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhmbkdyYXBoLCBzKTtcbiAgICAgICAgaWYgKHByb2Nlc3MuZW52LkdSQVBIVklaKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImhlcmUgdGhlIGZpbGUgXCIgKyBmbkdyYXBoKTtcbiAgICAgICAgICAgIGV4ZWNDbWQocHJvY2Vzcy5lbnYuR1JBUEhWSVogKyBcIiAtVGpwZWcgLU8gXCIgKyBmbkdyYXBoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuZXhwb3J0cy52aXNNb2RlbHMgPSB2aXNNb2RlbHM7XG5mdW5jdGlvbiB0YWJNb2RlbHMobSwgZm9sZGVyT3V0KSB7XG4gICAgbS5kb21haW5zLmZvckVhY2goZnVuY3Rpb24gKHNEb21haW4pIHtcbiAgICAgICAgdmFyIHMgPSB0YWJEb21haW4oc0RvbWFpbiwgbSk7XG4gICAgICAgIHZhciBmbkdyYXBoID0gZm9sZGVyT3V0ICsgXCIvXCIgKyBzRG9tYWluLnJlcGxhY2UoLyAvZywgJ18nKSArIFwiLmphZGVcIjtcbiAgICAgICAgZGVidWdsb2coXCJoZXJlIHRoZSBmaWxlIFwiICsgZm5HcmFwaCk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMoZm5HcmFwaCwgcyk7XG4gICAgfSk7XG59XG5leHBvcnRzLnRhYk1vZGVscyA9IHRhYk1vZGVscztcbiIsIi8qKlxuICogdmlzdWFsaXplIGEgbW9kZWwgYW5kIGNhbGN1bGF0ZSBzb21lIHN0YXRpc3RpY3NcbiAqL1xuXG5cblxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xuXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcblxuaW1wb3J0IHtNb2RlbCBhcyBNb2RlbH0gIGZyb20gJ2ZkZXZzdGFfbW9ubW92ZSc7XG5cbmltcG9ydCAqIGFzIFV0aWwgZnJvbSAnYWJvdF91dGlscyc7XG5cbmltcG9ydCAqIGFzIERlc2NyaWJlIGZyb20gJy4uL21hdGNoL2Rlc2NyaWJlJztcblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xuXG4vL2ltcG9ydCAqIGFzIGVsYXN0aWNsdW5yIGZyb20gJ2VsYXN0aWNsdW5yJztcblxudmFyIGRlYnVnbG9nID0gZGVidWcoJ3Zpc21vZGVsLnRzJyk7XG5cbmludGVyZmFjZSBDYXRlZ29yeVJlY29yZCB7XG4gIG90aGVyZG9tYWluczogc3RyaW5nW10sXG4gIG5yRGlzdGluY3RWYWx1ZXM6IG51bWJlcixcbiAgbnJEaXN0aW5jdFZhbHVlc0luRG9tYWluOiBudW1iZXIsXG4gIG5yUmVjb3JkczogbnVtYmVyLFxuICBuclJlY29yZHNJbkRvbWFpbjogbnVtYmVyLFxuICBuclRvdGFsUmVjb3Jkc0luRG9tYWluOiBudW1iZXJcbn07XG5cbnZhciBlbGFzdGljbHVuciA9IHJlcXVpcmUoJ2VsYXN0aWNsdW5yJyk7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIEpTT05Fc2NhcGUoczogc3RyaW5nKSB7XG5cbiAgcmV0dXJuIHMucmVwbGFjZSgvXFxcXC9nLCBcIlxcXFxcXFxcXCIpLnJlcGxhY2UoL1xcbi9nLCBcIlxcXFxuXCIpXG4gICAgLnJlcGxhY2UoL1xcJy9nLCBcIlxcXFwnXCIpXG4gICAgLnJlcGxhY2UoL1xcXCIvZywgJ1xcXFxcIicpXG4gICAgLnJlcGxhY2UoL1xcJi9nLCBcIlxcXFwmXCIpXG4gICAgLnJlcGxhY2UoL1xcci9nLCBcIlxcXFxyXCIpXG4gICAgLnJlcGxhY2UoL1xcdC9nLCBcIlxcXFx0XCIpO1xuICAvLyAucmVwbGFjZSgvXFxiL2csIFwiXFxcXGJcIilcbiAgLy8gLnJlcGxhY2UoL1xcZi9nLCBcIlxcXFxmXCIpO1xufTtcblxuXG5leHBvcnQgZnVuY3Rpb24gbWFrZUx1bnJJbmRleChtb2RlbHBhdGg6IHN0cmluZywgb3V0cHV0OiBzdHJpbmcsIHNpbGVudCA/IDogYm9vbGVhbikge1xuICB2YXIgbWRsID0gSlNPTi5wYXJzZSgnJyArIGZzLnJlYWRGaWxlU3luYyhtb2RlbHBhdGggKyAnLm1vZGVsLmpzb24nKSk7XG4gIHZhciBkYXRhID0gSlNPTi5wYXJzZSgnJyArIGZzLnJlYWRGaWxlU3luYyhtb2RlbHBhdGggKyAnLmRhdGEuanNvbicpKTtcblxuICB2YXIgY2F0cyA9IG1kbC5jYXRlZ29yeS5maWx0ZXIoYSA9PiB0eXBlb2YgYSAhPT0gJ3N0cmluZycpO1xuXG4gIHZhciBxYmVEYXRhT2JqZWN0cyA9IGNhdHMuZmlsdGVyKGNhdCA9PiAoY2F0LlFCRSB8fCBjYXQuUUJFSW5jbHVkZSkpO1xuXG4gIC8vY29uc29sZS5sb2coXCJoZXJlIGNhdHNcIiArIEpTT04uc3RyaW5naWZ5KGNhdHMpKTtcbiAgLy9jb25zb2xlLmxvZyhcIlxcbmhlcmUgZGF0YSBvYmplY3RzXCIgKyBKU09OLnN0cmluZ2lmeShxYmVEYXRhT2JqZWN0cykpO1xuICB2YXIgcWJlRGF0YU5hbWVzID0gcWJlRGF0YU9iamVjdHMubWFwKGNhdCA9PiBjYXQubmFtZSk7XG5cbiAgcWJlRGF0YU5hbWVzID0gXy51bmlvbihxYmVEYXRhTmFtZXMsIG1kbC5jb2x1bW5zKVxuXG5cbiAgdmFyIExVTlJJbmRleCA9IGNhdHMuZmlsdGVyKGNhdCA9PiBjYXQuTFVOUkluZGV4KS5tYXAoY2F0ID0+IGNhdC5uYW1lKTtcbiAgLy92YXIgZWxhc3RpY2x1bnIgPSByZXF1aXJlKCdsdW5yJyk7XG4gIHZhciBib21kYXRhID0gZGF0YTtcbiAgLy8gaW5kZXggYWxsIExVTlIgcHJvcGVydGllc1xuICB2YXIgaW5kZXggPSBlbGFzdGljbHVucihmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIExVTlJJbmRleCAvKlxuICAgICAgICAgICAgW1wiYXBwSWRcIixcbiAgICAgICAgICAgIFwiQXBwS2V5XCIsXG4gICAgICAgICAgICBcIkFwcE5hbWVcIixcbiAgICAgICAgICAgICAgICBcIkFwcGxpY2F0aW9uQ29tcG9uZW50XCIsXG4gICAgICAgICAgICAgICAgXCJSb2xlTmFtZVwiLFxuICAgICAgICAgICAgICAgIFwiQXBwbGljYXRpb25UeXBlXCIsXG4gICAgICAgICAgICAgICAgXCJCU1BOYW1lXCIsXG4gICAgICAgICAgICAgICAgXCJCU1BBcHBsaWNhdGlvblVSTFwiLFxuICAgICAgICAgICAgICAgIFwicmVsZWFzZU5hbWVcIixcbiAgICAgICAgICAgICAgICBcIkJ1c2luZXNzQ2F0YWxvZ1wiLFxuICAgICAgICAgICAgICAgIFwiVGVjaG5pY2FsQ2F0YWxvZ1wiXSAqLyAuZm9yRWFjaChmdW5jdGlvbiAoZmllbGQpIHtcbiAgICAgICAgdGhhdC5hZGRGaWVsZChmaWVsZCk7XG4gICAgICB9KTtcbiAgICB0aGlzLnNldFJlZignaWQnKTtcbiAgICB0aGlzLnNhdmVEb2N1bWVudChmYWxzZSk7XG4gIH0pO1xuICBib21kYXRhLmZvckVhY2goZnVuY3Rpb24gKG8sIGluZGV4KSB7XG4gICAgby5pZCA9IGluZGV4O1xuICB9KTtcbiAgYm9tZGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICBpbmRleC5hZGREb2MocmVjb3JkKTtcbiAgfSk7XG4gIHZhciBlbGFzdGljID0gaW5kZXg7XG5cbiAgLy8gZHVtcCB0aGUgbHVuciBpbmRleFxuICAvL1xuICB2YXIgdGhlSW5kZXggPSBpbmRleC50b0pTT04oKTtcbiAgdmFyIGNvbHVtbnMgPSBtZGwuY29sdW1ucy5tYXAoY29sbmFtZSA9PiAge1xuICAgIHZhciByZXMgPSBjYXRzLmZpbHRlcihjYXQgPT4gY2F0Lm5hbWUgPT09IGNvbG5hbWUpO1xuICAgIGlmKHJlcy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInVuZGVmaW5lZCBvciBub24tb2JqZWN0IGNvbHVtbiA6IFwiICsgY29sbmFtZSApO1xuICAgIH07XG4gICAgcmV0dXJuIHJlc1swXTtcbiAgfSk7XG5cbiAgdmFyIGNvbHVtbk5hbWVzID0gY29sdW1ucy5tYXAoY29sID0+IGNvbC5uYW1lKTtcblxuICB2YXIganNvbnAgPSBgdmFyIG1kbGRhdGEgPSB7fTtcXG4vL2NvbHVtbnMgXFxuIG1kbGRhdGEuY29sdW1ucyA9IFtcIiR7Y29sdW1ucy5tYXAoY29sID0+IGNvbC5uYW1lKS5qb2luKCdcIixcIicpfVwiXTtgO1xuXG4gIHZhciBqc29uID0gYHsgXCJjb2x1bW5zXCIgIDogW1wiJHtjb2x1bW5zLm1hcChjb2wgPT4gSlNPTkVzY2FwZShjb2wubmFtZSkpLmpvaW4oJ1wiLFwiJyl9XCJdLGA7XG4gIC8vIGpzb25wICs9IGBcXG4gbWRsZGF0YS5mdWxsZGF0YSA9ICR7SlNPTi5zdHJpbmdpZnkoYm9tZGF0YSl9O1xcbmA7XG4gIC8vanNvbnAgKz0gYFxcbi8vY29sdW1ucyBpbmZvIFxcbiBtZGxkYXRhLmx1bnJjb2x1bW5zID0gW1wieyR7TFVOUkluZGV4LmpvaW4oJ1wiLFwiJyl9XCJdO2A7XG5cbiAganNvbnAgKz0gYFxcbi8vY29sdW1ucyBpbmZvIFxcbiBtZGxkYXRhLmNvbHVtbnNEZXNjcmlwdGlvbiA9IHske2NvbHVtbnMubWFwKGNvbCA9PlxuICAgIGAgXFxuIFwiJHtjb2wubmFtZX1cIiA6ICBcIiR7SlNPTkVzY2FwZShjb2wuZGVzY3JpcHRpb24gfHwgY29sLm5hbWUpfVwiIGBcbiAgKS5qb2luKCcsJyl9XG4gICAgICB9O2A7XG5cbiAganNvbiArPSBgXCJjb2x1bW5zRGVzY3JpcHRpb25cIiA6IHske2NvbHVtbnMubWFwKGNvbCA9PlxuICAgIGAgXFxuIFwiJHtjb2wubmFtZX1cIiA6ICBcIiR7SlNPTkVzY2FwZShjb2wuZGVzY3JpcHRpb24gfHwgY29sLm5hbWUpfVwiIGBcbiAgKS5qb2luKCcsJyl9XG4gICAgICB9LGA7XG5cblxuICBqc29ucCArPSBgXFxuLy9jb2x1bW5zIGluZm8gXFxuIG1kbGRhdGEuY29sdW1uc0RlZmF1bHRXaWR0aCA9IHske2NvbHVtbnMubWFwKGNvbCA9PlxuICAgIGAgXFxuIFwiJHtjb2wubmFtZX1cIiA6ICR7Y29sLmRlZmF1bHRXaWR0aCB8fCAxNTB9IGBcbiAgKS5qb2luKCcsJyl9XG4gICAgICB9O2A7XG5cbiAganNvbiArPSBgXFxuXCJjb2x1bW5zRGVmYXVsdFdpZHRoXCIgOiB7JHtjb2x1bW5zLm1hcChjb2wgPT5cbiAgICBgIFxcbiBcIiR7Y29sLm5hbWV9XCIgOiAke2NvbC5kZWZhdWx0V2lkdGggfHwgMTUwfSBgXG4gICkuam9pbignLCcpfVxuICAgICAgfSxgO1xuXG5cblxuICB2YXIgdGhlSW5kZXhTdHIgPSBKU09OLnN0cmluZ2lmeSh0aGVJbmRleCk7XG5cbiAganNvbnAgKz0gXCJcXG52YXIgc2VySW5kZXggPVxcXCJcIiArIEpTT05Fc2NhcGUodGhlSW5kZXhTdHIpICsgXCJcXFwiO1xcblwiO1xuICAvLyBqc29ucCArPSBcIlxcbnZhciBzZXJJbmRleCA9XCIgKyBKU09OLnN0cmluZ2lmeSh0aGVJbmRleCkgKyBcIjtcXG5cIjtcblxuXG4gIGpzb24gKz0gJ1xcblwic2VySW5kZXhcIiA6JyArIHRoZUluZGV4U3RyICsgICcsJztcblxuICAvL2NvbnNvbGUubG9nKFwiaGVyZSBhbGwgbmFtZXMgXCIgKyBKU09OLnN0cmluZ2lmeShxYmVEYXRhTmFtZXMpKTtcbiAgdmFyIGNsZWFuc2VkZGF0YSA9IGJvbWRhdGEubWFwKG8gPT4ge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBxYmVEYXRhTmFtZXMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgcmVzW2tleV0gPSBvW2tleV07XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfSk7XG5cbiAgaWYoIXNpbGVudCkge1xuICAgIGNvbnNvbGUubG9nKFwiZHVtcGluZyBcIiArIG91dHB1dCk7XG4gICAgY29uc29sZS5sb2coXCJsZW5ndGggb2YgaW5kZXggc3RyXCIgKyB0aGVJbmRleFN0ci5sZW5ndGgpXG4gICAgY29uc29sZS5sb2coXCJhdmFpbGFibGUgICAgICAgICAgXCIgKyBjb2x1bW5zLmxlbmd0aCArIFwiIGNvbHVtbnNcIik7XG4gICAgY29uc29sZS5sb2coXCJyZXR1cm5pbmcgYXMgZGF0YSAgXCIgKyBxYmVEYXRhTmFtZXMubGVuZ3RoICsgXCIgY29sdW1uc1wiKTtcbiAgICBjb25zb2xlLmxvZyhcImluZGV4aW5nICAgICAgICAgICBcIiArIExVTlJJbmRleC5sZW5ndGggKyBcIiBjb2x1bW5zXCIpO1xuICAgIGNvbnNvbGUubG9nKCdyZXR1cm5lZCBidXQgbm90IGF2YWlsYWJsZScgLCBfLmRpZmZlcmVuY2UocWJlRGF0YU5hbWVzLCBjb2x1bW5OYW1lcykuam9pbihcIiwgXCIpKTtcbiAgICBjb25zb2xlLmxvZygncmV0dXJuZWQgYnV0IG5vdCBpbmRleGVkJyAsIF8uZGlmZmVyZW5jZShxYmVEYXRhTmFtZXMsIExVTlJJbmRleCkuam9pbihcIiwgXCIpKTtcbiAgfVxuXG4gIGpzb25wICs9IFwidmFyIGRhdGE9XCIgKyBKU09OLnN0cmluZ2lmeShjbGVhbnNlZGRhdGEpICsgXCI7XCI7XG5cbiAganNvbiArPSAnXCJkYXRhXCI6JyArIEpTT04uc3RyaW5naWZ5KGNsZWFuc2VkZGF0YSkgKyBcIlxcbn1cIjtcblxuICBqc29ucCArPSBgXG5cbiAgICAgICAgICAgLy8gdmFyIGVsYXN0aWMgPSBlbGFzdGljbHVuci5JbmRleC5sb2FkKHNlckluZGV4KTtcblxuICBgO1xuXG4gIC8vZnMud3JpdGVGaWxlU3luYyhvdXRwdXQgKyBcIi5sdW5yLmpzXCIsIGpzb25wKTtcbiAgZnMud3JpdGVGaWxlU3luYyhvdXRwdXQgKyBcIi5sdW5yLmpzb25cIiwganNvbik7XG59XG5cblxuXG5cblxuLypcblxuICB2YXIgaW5kZXggPSBlbGFzdGlsdW5yLkluZGV4LmxvYWQob2JqKTtcblxuXG59XG5cbiBcIlFCRVwiIDogZmFsc2UsXG4gICAgICBcIlFCRUluY2x1ZGVcIiA6IHRydWUsXG4gICAgICBcIkxVTlJJbmRleFwiOiBmYWxzZVxuKi9cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjQ2F0ZWdvcnlSZWNvcmQobTogSU1hdGNoLklNb2RlbHMsIGNhdGVnb3J5OiBzdHJpbmcsIGRvbWFpbjogc3RyaW5nKTogQ2F0ZWdvcnlSZWNvcmQge1xuXG4gIHZhciBvdGhlcmRvbWFpbnMgPSBNb2RlbC5nZXREb21haW5zRm9yQ2F0ZWdvcnkobSwgY2F0ZWdvcnkpO1xuICBfLnB1bGwob3RoZXJkb21haW5zLCBkb21haW4pO1xuICB2YXIgcmVzID0ge1xuICAgIG90aGVyZG9tYWluczogb3RoZXJkb21haW5zLFxuICAgIG5yRGlzdGluY3RWYWx1ZXM6IDAsXG4gICAgbnJEaXN0aW5jdFZhbHVlc0luRG9tYWluOiAwLFxuICAgIG5yUmVjb3JkczogMCxcbiAgICBuclJlY29yZHNJbkRvbWFpbjogMCxcbiAgICBuclRvdGFsUmVjb3Jkc0luRG9tYWluOiAwLFxuICB9IGFzIENhdGVnb3J5UmVjb3JkO1xuXG4gIHZhciB2YWx1ZXMgPSBbXTtcbiAgdmFyIHZhbHVlc0luRG9tYWluID0gW107XG4gIHZhciBuclJlY29yZHNJbkRvbWFpbiA9IDA7XG4gIHZhciBkaXN0aW5jdFZhbHVlcyA9IG0ucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvRW50cnkpIHtcbiAgICBpZiAob0VudHJ5Ll9kb21haW4gPT09IGRvbWFpbikge1xuICAgICAgcmVzLm5yVG90YWxSZWNvcmRzSW5Eb21haW4gKz0gMTtcbiAgICB9XG4gICAgaWYgKG9FbnRyeVtjYXRlZ29yeV0pIHtcbiAgICAgIHZhciB2YWx1ZSA9IG9FbnRyeVtjYXRlZ29yeV07XG4gICAgICBpZiAob0VudHJ5Ll9kb21haW4gPT09IGRvbWFpbikge1xuICAgICAgICB2YWx1ZXNJbkRvbWFpblt2YWx1ZV0gPSAodmFsdWVzSW5Eb21haW5bdmFsdWVdIHx8IDApICsgMTtcbiAgICAgICAgcmVzLm5yUmVjb3Jkc0luRG9tYWluICs9IDE7XG4gICAgICB9XG4gICAgICB2YWx1ZXNbdmFsdWVdID0gKHZhbHVlc1t2YWx1ZV0gfHwgMCkgKyAxO1xuICAgICAgcmVzLm5yUmVjb3JkcyArPSAxO1xuICAgIH1cbiAgfSk7XG4gIHJlcy5uckRpc3RpbmN0VmFsdWVzID0gT2JqZWN0LmtleXModmFsdWVzKS5sZW5ndGg7XG4gIHJlcy5uckRpc3RpbmN0VmFsdWVzSW5Eb21haW4gPSBPYmplY3Qua2V5cyh2YWx1ZXNJbkRvbWFpbikubGVuZ3RoO1xuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ3JhcGhEb21haW4oZG9tYWluOiBzdHJpbmcsIG06IElNYXRjaC5JTW9kZWxzKSB7XG4gIC8vIGRyYXcgYSBtb2RlbCBkb21haW5zXG4gIHZhciByZXMgPSBgXG4gICAgZGlncmFwaCBzZHN1IHtcblx0c2l6ZT1cIjM2LDM2XCI7XG4gICByYW5rZGlyPUxSXG5cdG5vZGUgW2NvbG9yPXllbGxvdywgc3R5bGU9ZmlsbGVkXTtcbiAgICBcIiR7ZG9tYWlufVwiXG4gIGA7XG4gIC8vIGFkZCBhbGwgY2F0ZWdvcnkgbm9kZXNcbiAgcmVzICs9IGBub2RlIFtzaGFwZT1yZWNvcmQsIGNvbG9yPXllbGxvdywgc3R5bGU9ZmlsbGVkXTtcXG4gYFxuICB2YXIgY2F0cyA9IE1vZGVsLmdldENhdGVnb3JpZXNGb3JEb21haW4obSwgZG9tYWluKTtcblxuICB2YXIgY2F0ZWdvcnlSZXN1bHRzID0ge307XG4gIHZhciBvdGhlcmRvbWFpbnMgPSBbXTtcbiAgY2F0cy5mb3JFYWNoKGZ1bmN0aW9uIChjYXQpIHtcbiAgICB2YXIgY2F0UmVzdWx0ID0gY2FsY0NhdGVnb3J5UmVjb3JkKG0sIGNhdCwgZG9tYWluKTtcbiAgICBjYXRlZ29yeVJlc3VsdHNbY2F0XSA9IGNhdFJlc3VsdDtcbiAgICBvdGhlcmRvbWFpbnMgPSBfLnVuaW9uKG90aGVyZG9tYWlucywgY2F0ZWdvcnlSZXN1bHRzW2NhdF0ub3RoZXJEb21haW5zKTtcbiAgICByZXMgKz0gYFwiJHtjYXR9XCIgW2xhYmVsPVwieyAke2NhdH0gfCAke2NhdFJlc3VsdC5uckRpc3RpbmN0VmFsdWVzSW5Eb21haW59IFZhbHVlcyBpbiAke2NhdFJlc3VsdC5uclJlY29yZHNJbkRvbWFpbn0gYDtcbiAgICBpZiAoY2F0UmVzdWx0Lm5yUmVjb3Jkc0luRG9tYWluICE9PSBjYXRSZXN1bHQubnJSZWNvcmRzKSB7XG4gICAgICByZXMgKz0gYHwgICR7Y2F0UmVzdWx0Lm5yRGlzdGluY3RWYWx1ZXMgLSBjYXRSZXN1bHQubnJEaXN0aW5jdFZhbHVlc0luRG9tYWlufSBvdGhlciB2YWx1ZXMgaW4gJHtjYXRSZXN1bHQubnJSZWNvcmRzIC0gY2F0UmVzdWx0Lm5yUmVjb3Jkc0luRG9tYWlufSBvdGhlciByZWNvcmRzYDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzICs9IGAgYDtcbiAgICB9XG4gICAgcmVzICs9IGB9XCJdXFxuYDtcbiAgfSk7XG5cbiAgLy8gY2FsY3VsYXRlIG90aGVyIGRvbWFpbnMuXG4gIC8vIGRyYXcgXCJvdGhlciBjYXRlZ29yaWVzXCJcbiAgcmVzICs9IGBub2RlIFtjb2xvcj1wdXJwbGUsIHN0eWxlPWZpbGxlZF07IFxcbmBcbiAgb3RoZXJkb21haW5zLmZvckVhY2goZnVuY3Rpb24gKG90aGVyZG9tYWluKSB7XG4gICAgcmVzICs9IGBcIiR7b3RoZXJkb21haW59XCIgXFxuYDtcbiAgfSk7XG4gIC8vIGNvdW50IHJlY29yZHMgaW4gZG9tYWluIDpcbiAgdmFyIG5yUmVjb3JkcyA9IG0ucmVjb3Jkcy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGVudHJ5KSB7XG4gICAgcmV0dXJuIHByZXYgKyAoKGVudHJ5Ll9kb21haW4gPT09IGRvbWFpbikgPyAxIDogMCk7XG4gIH0sIDApO1xuICByZXMgKz0gYG5vZGUgW3NoYXBlPXJlY29yZF07IFxcbmBcbiAgcmVzICs9IGAgXCJyZWNvcmRcIiBbbGFiZWw9XCJ7PGYwPiAke2RvbWFpbn0gfCAke25yUmVjb3Jkc319XCJdIFxcbmA7XG5cbiAgcmVzICs9IGAgXCJyX290aGVyXCIgW2xhYmVsPVwiezxmMD4gb3RoZXIgfCAke25yUmVjb3Jkc319XCJdIFxcbiBgO1xuXG4gIHJlcyArPSBgIyByZWxhdGlvbiBmcm9tIGNhdGVnb3JpZXMgdG8gZG9tYWluXFxuYDtcbiAgY2F0cy5mb3JFYWNoKGZ1bmN0aW9uIChjYXQpIHtcbiAgICByZXMgKz0gYCBcIiR7Y2F0fVwiIC0+IFwiJHtkb21haW59XCIgXFxuYDtcbiAgfSlcblxuXG4gIHJlcyArPSBgIyByZWxhdGlvbiBmcm9tIGNhdGVnb3JpZXMgdG8gcmVjb3Jkc1xcbmA7XG4gIGNhdHMuZm9yRWFjaChmdW5jdGlvbiAoY2F0KSB7XG4gICAgdmFyIHJlYyA9IGNhdGVnb3J5UmVzdWx0c1tjYXRdO1xuICAgIHJlcyArPSBgIFwiJHtjYXR9XCIgLT4gXCJyZWNvcmRcIiBcXG5gO1xuICB9KVxuXG5cbiAgLy9vdGhlciBkb21haW5zIHRvIHRoaXNcbiAgY2F0cy5mb3JFYWNoKGZ1bmN0aW9uIChjYXQpIHtcblxuXG4gIH0pXG5cbiAgLypcbiAgY2F0cyBmb1xuICAgIGRpZ3JhcGggc2RzdSB7XG5cdHNpemU9XCIzNiwzNlwiO1xuXHRub2RlIFtjb2xvcj15ZWxsb3csIHN0eWxlPWZpbGxlZF07XG5cdEZMUEQgRkxQIFwiQk9NIEVkaXRvclwiLCBcIldJS0lVUkxcIiBcIlVJNSBEb2N1bWVudGF0aW9uXCIsIFwiVUk1IEV4YW1wbGVcIiwgXCJTVEFSVFRBXCJcblx0QkNQXG5cdG5vZGUgW2NvbG9yPWdyZXksIHN0eWxlPWZpbGxlZF07XG5cdG5vZGUgW2ZvbnRuYW1lPVwiVmVyZGFuYVwiLCBzaXplPVwiMzAsMzBcIl07XG5cdG5vZGUgW2NvbG9yPWdyZXksIHN0eWxlPWZpbGxlZF07XG5cdGdyYXBoIFsgZm9udG5hbWUgPSBcIkFyaWFsXCIsXG4gICovXG4gIHJlcyArPSBgfVxcbmA7XG4gIHJldHVybiByZXM7XG59XG4vKlxuICAgIGNhdGVnb3J5RGVzYyA6IHRoZU1vZGVsLmZ1bGwuZG9tYWluW2ZpbHRlcmRvbWFpbl0uY2F0ZWdvcmllc1tjYXRlZ29yeV0sXG4gICAgZGlzdGluY3QgOiBkaXN0aW5jdCxcbiAgICBkZWx0YSA6IGRlbHRhLFxuICAgIHByZXNlbnRSZWNvcmRzIDogcmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMsXG4gICAgcGVyY1ByZXNlbnQgOiBwZXJjZW50LFxuICAgIHNhbXBsZVZhbHVlcyA6IHZhbHVlc0xpc3RcbiAgfVxuKi9cblxuZnVuY3Rpb24gcmVwbGFjZUJyKHN0cmluZzogc3RyaW5nKTogc3RyaW5nIHtcbiAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2UoL1xcbi9nLFxuICAgIGBcblxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdGJyXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHR8IGBcbiAgKTtcbiAgcmV0dXJuIHN0cmluZztcbn1cblxuXG5cblxuLyoqXG4gKiBnZW5lcmF0ZSBhIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgYSBkb21haW5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRhYkRvbWFpbihkb21haW46IHN0cmluZywgbTogSU1hdGNoLklNb2RlbHMpIHtcbiAgLy8gZHJhdyBhIG1vZGVsIGRvbWFpbnNcblxuICB2YXIgY2F0cyA9IE1vZGVsLmdldENhdGVnb3JpZXNGb3JEb21haW4obSwgZG9tYWluKTtcbiAgY2F0cyA9IE1vZGVsLnNvcnRDYXRlZ29yaWVzQnlJbXBvcnRhbmNlKG0uZnVsbC5kb21haW5bZG9tYWluXS5jYXRlZ29yaWVzIHx8IHt9LCBjYXRzKTtcbiAgLy9jb25zb2xlLmxvZyhjYXRzLmpvaW4oXCJcXG5cIikpO1xuICB2YXIgY2F0ZGVzYyA9IERlc2NyaWJlLmdldENhdGVnb3J5U3RhdHNJbkRvbWFpbihjYXRzWzBdLCBkb21haW4sIG0pO1xuICB2YXIgY2F0UmVzdWx0ID0gY2FsY0NhdGVnb3J5UmVjb3JkKG0sIGNhdHNbMF0sIGRvbWFpbik7XG5cbiAgdmFyIGRvbWFpbkRlc2NyID0gbS5mdWxsLmRvbWFpbltkb21haW5dLmRlc2NyaXB0aW9uIHx8IFwiXCI7XG4gIGRvbWFpbkRlc2NyID0gcmVwbGFjZUJyKGRvbWFpbkRlc2NyKTtcbiAgdmFyIHJlcyA9IGBcblxuLy8gcHJlc2V0IGZvcm0gdmFsdWVzIGlmIHdlIHJlY2VpdmUgYSB1c2VyZGF0YSBvYmplY3QgLy9cbi0gdXNlciA9IHVzZXJcblxuZXh0ZW5kcyAuLi9sYXlvdXRfcFxuXG5ibG9jayBjb250ZW50XG5cblx0bmF2Lm5hdmJhci5uYXZiYXItZGVmYXVsdC5uYXZiYXItZml4ZWQtdG9wXG5cdFx0LmNvbnRhaW5lclxuXHRcdFx0Lm5hdmJhci1oZWFkZXJcblx0XHRcdFx0Lm5hdmJhci1icmFuZChzdHlsZT0nYmdjb2xvcjpvcmFuZ2U7Y29sb3I6ZGFya2JsdWU7Zm9udC1mYW1pbHk6QXJpYWwgQmxhY2s7Zm9udC1zaXplOjE1LjExOHB4Jykgd29zYXAgZG9tYWluICR7ZG9tYWlufVxuXHRcdFx0dWwubmF2Lm5hdmJhci1uYXYubmF2YmFyLXJpZ2h0ICN7dWlkfVxuXHRcdFx0XHRsaVxuXHRcdFx0XHRcdC5uYXZiYXItYnRuI2J0bi1sb2dvdXQuYnRuLmJ0bi1kZWZhdWx0KG9uY2xpY2s9XCJsb2NhdGlvbi5ocmVmPScvaG9tZSdcIilcblx0XHRcdFx0XHRcdHwgYmFjayB0byBob21lXG5cblx0cCAgJm5ic3A7XG5cdHAgJm5ic3A7XG5cdHBcblxuXHRkaXYud2VsbFxuXHRcdGgzIGRvbWFpbiBcIiR7ZG9tYWlufVwiXG5cdFx0XHRzcGFuLnB1bGwtcmlnaHQgJHtjYXRSZXN1bHQubnJUb3RhbFJlY29yZHNJbkRvbWFpbn0gcmVjb3Jkc1xuXHRcdHBcblx0XHRzcGFuICR7ZG9tYWluRGVzY3J9XG5cblx0XHR0YWJsZS50YWJsZS50YWJsZS1jb25kZW5zZWQudGFibGUtc3RyaXBlZFxuXHRcdFx0dGhlYWRcblx0XHRcdFx0dHJcblx0XHRcdFx0XHR0aCBjYXRlZ29yeVxuXHRcdFx0XHRcdHRoKHN0eWxlPVwid2lkdGg6MTAlXCIpIGNvdW50XG5cdFx0XHRcdFx0dGhcblx0XHRcdFx0XHRcdHRhYmxlXG5cdFx0XHRcdFx0XHRcdHRyXG5cdFx0XHRcdFx0XHRcdFx0dGQgc3lub255bXNcblx0XHRcdFx0XHRcdFx0dHJcblx0XHRcdFx0XHRcdFx0XHR0ZCBkZXNjcmlwdGlvblxuXHRcdFx0XHRcdFx0XHR0clxuXHRcdFx0XHRcdFx0XHRcdHRkIGV4YW1wbGUgdmFsdWVzXG5cdFx0XHR0Ym9keVxuYDtcblxuICB2YXIgY2F0ZWdvcnlSZXN1bHRzID0ge307XG4gIHZhciBvdGhlcmRvbWFpbnMgPSBbXTtcbiAgdmFyIGNhdGVnb3J5TWFwID0gbS5mdWxsLmRvbWFpbltkb21haW5dLmNhdGVnb3JpZXMgfHwge307XG4gIGNhdHMuZm9yRWFjaChmdW5jdGlvbiAoY2F0KSB7XG4gICAgdmFyIGNhdGRlc2MgPSBEZXNjcmliZS5nZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0LCBkb21haW4sIG0pO1xuICAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoY2F0ZGVzYykpO1xuICAgIHZhciBjYXRSZXN1bHQgPSBjYWxjQ2F0ZWdvcnlSZWNvcmQobSwgY2F0LCBkb21haW4pO1xuICAgIGNhdGVnb3J5UmVzdWx0c1tjYXRdID0gY2F0UmVzdWx0O1xuICAgIG90aGVyZG9tYWlucyA9IF8udW5pb24ob3RoZXJkb21haW5zLCBjYXRlZ29yeVJlc3VsdHNbY2F0XS5vdGhlckRvbWFpbnMpO1xuICAgIC8qXG4gICAgICAgIHJlcyArPSBgXCIke2NhdH1cIiBbbGFiZWw9XCJ7ICR7Y2F0fSB8ICR7Y2F0UmVzdWx0Lm5yRGlzdGluY3RWYWx1ZXNJbkRvbWFpbn0gVmFsdWVzIGluICR7Y2F0UmVzdWx0Lm5yUmVjb3Jkc0luRG9tYWlufSBgO1xuICAgICAgICBpZihjYXRSZXN1bHQubnJSZWNvcmRzSW5Eb21haW4gIT09IGNhdFJlc3VsdC5uclJlY29yZHMpIHtcbiAgICAgICAgICByZXMgKz0gIGB8ICAke2NhdFJlc3VsdC5uckRpc3RpbmN0VmFsdWVzIC0gY2F0UmVzdWx0Lm5yRGlzdGluY3RWYWx1ZXNJbkRvbWFpbn0gb3RoZXIgdmFsdWVzIGluICR7Y2F0UmVzdWx0Lm5yUmVjb3JkcyAtIGNhdFJlc3VsdC5uclJlY29yZHNJbkRvbWFpbn0gb3RoZXIgcmVjb3Jkc2A7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzICs9IGAgYDtcbiAgICAgICAgfVxuICAgICAgICByZXMgKz0gYH1cIl1cXG5gO1xuICAgICovXG4gICAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShtLmZ1bGwuZG9tYWluW2RvbWFpbl0pKTtcbiAgICBpZiAobS5mdWxsLmRvbWFpbltkb21haW5dLmNhdGVnb3JpZXNbY2F0XSkge1xuXG4gICAgICB2YXIgc3lub255bXNTdHJpbmcgPSBVdGlsLmxpc3RUb0NvbW1hQW5kKGNhdGRlc2MuY2F0ZWdvcnlEZXNjICYmIGNhdGRlc2MuY2F0ZWdvcnlEZXNjLnN5bm9ueW1zICYmIGNhdGRlc2MuY2F0ZWdvcnlEZXNjLnN5bm9ueW1zIHx8IFtdKSB8fCBcIiZuYnNwO1wiO1xuXG4gICAgICByZXMgKz0gYFxuXHRcdFx0dHJcblx0XHRcdFx0XHR0ZC5jYXRfY291bnQgJHtjYXR9XG5cXHRcXHRcXHRcXHRcXHR0ZCAke2NhdGRlc2MucHJlc2VudFJlY29yZHN9IGRpc3RpbmN0IHZhbHVlcyBpbiAke2NhdGRlc2MucGVyY1ByZXNlbnR9JSBvZiByZWNvcmRzXG5cXHRcXHRcXHRcXHRcXHR0ZFxuXFx0XFx0XFx0XFx0XFx0XFx0dGFibGVcblxcdFxcdFxcdFxcdFxcdFxcdFxcdHRyLmNhdF9zeW5vbnltc1xuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0dGQgJHtzeW5vbnltc1N0cmluZ31cblxcdFxcdFxcdFxcdFxcdFxcdFxcdHRyLmNhdF9kZXNjcmlwdGlvblxuXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0dGQgJHtyZXBsYWNlQnIoY2F0ZGVzYy5jYXRlZ29yeURlc2MgJiYgY2F0ZGVzYy5jYXRlZ29yeURlc2MuZGVzY3JpcHRpb24gfHwgXCJcIil9XG5cXHRcXHRcXHRcXHRcXHRcXHRcXHR0ci5jYXRfc2FtcGxldmFsdWVzXG5cXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHR0ZCAke3JlcGxhY2VCcihjYXRkZXNjLnNhbXBsZVZhbHVlcyl9XG4gICAgICBgO1xuICAgIH1cblxuICB9KTtcblxuICB2YXIgb3RoZXJjYXRzID0gY2F0cy5sZW5ndGggLSBPYmplY3Qua2V5cyhtLmZ1bGwuZG9tYWluW2RvbWFpbl0uY2F0ZWdvcmllcykubGVuZ3RoO1xuICB2YXIgcmVtYWluaW5nQ2F0ZWdvcmllcyA9IF8uZGlmZmVyZW5jZShjYXRzLCBPYmplY3Qua2V5cyhtLmZ1bGwuZG9tYWluW2RvbWFpbl0uY2F0ZWdvcmllcykpO1xuICBpZiAoKG90aGVyY2F0cykgPiAwKSB7XG4gICAgcmVzICs9IGBcblxcdFxcdHAgICBhbmQgJHtvdGhlcmNhdHN9IG90aGVyIGNhdGVnb3JpZXNcblxcdFxcdHwgJHtVdGlsLmxpc3RUb0NvbW1hQW5kKHJlbWFpbmluZ0NhdGVnb3JpZXMpfVxuICAgICAgIGBcblxuICB9XG4gIC8qXG4gICAgLy8gY2FsY3VsYXRlIG90aGVyIGRvbWFpbnMuXG4gICAgLy8gZHJhdyBcIm90aGVyIGNhdGVnb3JpZXNcIlxuICAgIHJlcyArPSBgbm9kZSBbY29sb3I9cHVycGxlLCBzdHlsZT1maWxsZWRdOyBcXG5gXG4gICAgb3RoZXJkb21haW5zLmZvckVhY2goZnVuY3Rpb24ob3RoZXJkb21haW4pIHtcbiAgICAgIHJlcyArPSBgXCIke290aGVyZG9tYWlufVwiIFxcbmA7XG4gICAgfSk7XG4gICAgLy8gY291bnQgcmVjb3JkcyBpbiBkb21haW4gOlxuICAgIHZhciBuclJlY29yZHMgPSBtLnJlY29yZHMucmVkdWNlKGZ1bmN0aW9uKHByZXYsZW50cnkpIHtcbiAgICByZXR1cm4gcHJldiArICgoZW50cnkuX2RvbWFpbiA9PT0gZG9tYWluKSA/IDEgOiAwKTtcbiAgICB9LDApO1xuICAgIHJlcyArPSBgbm9kZSBbc2hhcGU9cmVjb3JkXTsgXFxuYFxuICAgIHJlcyArPSBgIFwicmVjb3JkXCIgW2xhYmVsPVwiezxmMD4gJHtkb21haW59IHwgJHtuclJlY29yZHN9fVwiXSBcXG5gO1xuXG4gICAgcmVzICs9IGAgXCJyX290aGVyXCIgW2xhYmVsPVwiezxmMD4gb3RoZXIgfCAke25yUmVjb3Jkc319XCJdIFxcbiBgO1xuXG4gICAgcmVzICs9IGAjIHJlbGF0aW9uIGZyb20gY2F0ZWdvcmllcyB0byBkb21haW5cXG5gO1xuICAgIGNhdHMuZm9yRWFjaChmdW5jdGlvbihjYXQpIHtcbiAgICAgIHJlcyArPSBgIFwiJHtjYXR9XCIgLT4gXCIke2RvbWFpbn1cIiBcXG5gO1xuICAgIH0pXG5cblxuICAgIHJlcyArPSBgIyByZWxhdGlvbiBmcm9tIGNhdGVnb3JpZXMgdG8gcmVjb3Jkc1xcbmA7XG4gICAgY2F0cy5mb3JFYWNoKGZ1bmN0aW9uKGNhdCkge1xuICAgICAgdmFyIHJlYyA9IGNhdGVnb3J5UmVzdWx0c1tjYXRdO1xuICAgICAgcmVzICs9IGAgXCIke2NhdH1cIiAtPiBcInJlY29yZFwiIFxcbmA7XG4gICAgfSlcblxuXG4gICAgLy9vdGhlciBkb21haW5zIHRvIHRoaXNcbiAgICBjYXRzLmZvckVhY2goZnVuY3Rpb24oY2F0KSB7XG5cblxuICAgIH0pXG4gICovXG4gIC8qXG4gIGNhdHMgZm9cbiAgICBkaWdyYXBoIHNkc3Uge1xuXHRzaXplPVwiMzYsMzZcIjtcblx0bm9kZSBbY29sb3I9eWVsbG93LCBzdHlsZT1maWxsZWRdO1xuXHRGTFBEIEZMUCBcIkJPTSBFZGl0b3JcIiwgXCJXSUtJVVJMXCIgXCJVSTUgRG9jdW1lbnRhdGlvblwiLCBcIlVJNSBFeGFtcGxlXCIsIFwiU1RBUlRUQVwiXG5cdEJDUFxuXHRub2RlIFtjb2xvcj1ncmV5LCBzdHlsZT1maWxsZWRdO1xuXHRub2RlIFtmb250bmFtZT1cIlZlcmRhbmFcIiwgc2l6ZT1cIjMwLDMwXCJdO1xuXHRub2RlIFtjb2xvcj1ncmV5LCBzdHlsZT1maWxsZWRdO1xuXHRncmFwaCBbIGZvbnRuYW1lID0gXCJBcmlhbFwiLFxuICAqL1xuICByZXMgKz0gYFxuXHRcdGgzIFZlcnNpb25cblx0XHRcdGEuc21hbGwoaHJlZj1cIi93aGF0c25ld1wiKVxuXG5cbmJsb2NrIHNjcmlwdHNcblx0c2NyaXB0KHNyYz0nL3ZlbmRvci9qcXVlcnktMi4yLjMubWluLmpzJylcblx0c2NyaXB0KHNyYz0nL3ZlbmRvci9ib290c3RyYXAubWluLmpzJylcblx0c2NyaXB0KHNyYz0nL2pzL3ZpZXdzL3NldHRpbmdzLmpzJylcbmA7XG4gIHJldHVybiByZXM7XG59XG5cblxuXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5cblxuZnVuY3Rpb24gZXhlY0NtZChjbWQ6IHN0cmluZykge1xuICBleGVjKGNtZCwgZnVuY3Rpb24gKGVycm9yLCBzdGRvdXQsIHN0ZGVycikge1xuICAgIGlmIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihgZXhlYyBlcnJvcjogJHtlcnJvcn1gKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApXG4gICAgY29uc29sZS5sb2coYHN0ZGVycjogJHtzdGRlcnJ9YClcbiAgfSlcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiB2aXNNb2RlbHMobTogSU1hdGNoLklNb2RlbHMsIGZvbGRlck91dDogc3RyaW5nKSB7XG4gIG0uZG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uIChzRG9tYWluKSB7XG4gICAgdmFyIHMgPSBncmFwaERvbWFpbihzRG9tYWluLCBtKTtcbiAgICB2YXIgZm5HcmFwaCA9IGZvbGRlck91dCArIFwiL1wiICsgc0RvbWFpbi5yZXBsYWNlKC8gL2csICdfJykgKyBcIi5ndlwiO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoZm5HcmFwaCwgcyk7XG4gICAgaWYgKHByb2Nlc3MuZW52LkdSQVBIVklaKSB7XG4gICAgICBjb25zb2xlLmxvZyhcImhlcmUgdGhlIGZpbGUgXCIgKyBmbkdyYXBoKTtcbiAgICAgIGV4ZWNDbWQocHJvY2Vzcy5lbnYuR1JBUEhWSVogKyBcIiAtVGpwZWcgLU8gXCIgKyBmbkdyYXBoKTtcbiAgICB9XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGFiTW9kZWxzKG06IElNYXRjaC5JTW9kZWxzLCBmb2xkZXJPdXQ6IHN0cmluZykge1xuICBtLmRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbiAoc0RvbWFpbikge1xuICAgIHZhciBzID0gdGFiRG9tYWluKHNEb21haW4sIG0pO1xuICAgIHZhciBmbkdyYXBoID0gZm9sZGVyT3V0ICsgXCIvXCIgKyBzRG9tYWluLnJlcGxhY2UoLyAvZywgJ18nKSArIFwiLmphZGVcIjtcbiAgICBkZWJ1Z2xvZyhcImhlcmUgdGhlIGZpbGUgXCIgKyBmbkdyYXBoKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGZuR3JhcGgsIHMpO1xuICB9KTtcbn1cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
