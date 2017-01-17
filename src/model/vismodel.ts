/**
 * visualize a model and calculate some statistics
 */



import * as IMatch from '../match/ifmatch';


import * as fs from 'fs';

import * as Model from './model';

import * as _ from 'lodash';

interface CategoryRecord {
    otherdomains : string[],
    nrDistinctValues : number,
    nrDistinctValuesInDomain : number,
    nrRecords : number,
    nrRecordsInDomain: number
  };

export function calcCategoryRecord(m : IMatch.IModels, category : string, domain : string)  : CategoryRecord {

  var otherdomains = Model.getDomainsForCategory(m,category);
   _.pull(otherdomains, domain);
   var res = {
    otherdomains : otherdomains,
    nrDistinctValues : 0,
    nrDistinctValuesInDomain : 0,
    nrRecords : 0,
    nrRecordsInDomain: 0
  } as CategoryRecord;

   var values = [];
   var valuesInDomain = [];
   var nrRecordsInDomain = 0;
   var distinctValues = m.records.forEach(function(oEntry) {
     if (oEntry[category]) {
       var value = oEntry[category];
       if(oEntry._domain === domain) {
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

export function graphDomain(domain : string, m : IMatch.IModels) {
  // draw a model domains
  var res = `
    digraph sdsu {
	size="36,36";
   rankdir=LR
	node [color=yellow, style=filled];
    "${domain}"
  `;
  // add all category nodes
  res += `node [shape=record, color=yellow, style=filled];\n `
  var cats = Model.getCategoriesForDomain(m,domain);

  var categoryResults = {};
  var otherdomains = [];
  cats.forEach(function(cat) {
    var catResult = calcCategoryRecord(m, cat, domain);
    categoryResults[cat] = catResult;
    otherdomains = _.union(otherdomains, categoryResults[cat].otherDomains);
    res += `"${cat}" [label="{ ${cat} | ${catResult.nrDistinctValuesInDomain} Values in ${catResult.nrRecordsInDomain} `;
    if(catResult.nrRecordsInDomain !== catResult.nrRecords) {
      res +=  `|  ${catResult.nrDistinctValues - catResult.nrDistinctValuesInDomain} other values in ${catResult.nrRecords - catResult.nrRecordsInDomain} other records`;
    } else {
      res += ` `;
    }
    res += `}"]\n`;
  });

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
  res += `}\n`;
  return res;
}

import { exec } from 'child_process';


function execCmd(cmd : string) {
 exec(cmd, function (error, stdout, stderr) {
    if (error) {
      console.error(`exec error: ${error}`)
      return
    }
    console.log(`stdout: ${stdout}`)
    console.log(`stderr: ${stderr}`)
  })
};

export function visModels(m : IMatch.IModels, folderOut : string ) {
  m.domains.forEach(function(sDomain) {
    var s = graphDomain(sDomain,m);
    var fnGraph = folderOut + "/" + sDomain + ".gv"
    fs.writeFileSync(fnGraph, s);
    if(process.env.GRAPHVIZ) {
      execCmd(process.env.GRAPHVIZ + " -Tjpeg -O " + fnGraph);
    }
  });
}

