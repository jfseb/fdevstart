
/**
 * maketable.ts
 *
 * @file
 * @copyright (c) 2016 Gerd Forstmann
 */


import * as debug from 'debug';

const debuglog = debug('maketable')

import * as IMatch from '../match/ifmatch';
import * as Model from '../model/model';
import * as Utils from '../utils/utils';

import * as _ from 'lodash';


export function makeTable(categories : string[], theModel: IMatch.IModels ) : { text: string, action : { url? : string } }
{
  //
  debuglog("makeTable for " + JSON.stringify(categories));
  //
  var aFilteredDomains = Model.getDomainsForCategory(theModel, categories[0]);
  categories.forEach(category => {
          var catsForDomain = Model.getDomainsForCategory(theModel,category);
          aFilteredDomains = _.intersection(aFilteredDomains,catsForDomain);
  });
  if(aFilteredDomains.length === 0) {
    return  {
      text :  'No commxon domains for ' + Utils.listToQuotedCommaAnd(categories),
      action : {}
    }
  }
  var domain = aFilteredDomains[0];
  //
  var columns = Model.getTableColumns(theModel, domain);
  if(columns.length === 0) {
    return {
      text :  'Apologies, but i cannot make a table for domain ' + domain + ' ',
      action : {}
    }
  }
  var indexMap = categories.map( category =>   columns.indexOf(category) ).filter(i => i >= 0);
  if(indexMap.length === 0) {
    return  {
      text :  'Apologies, but ' + Utils.listToQuotedCommaAnd(categories) + ' does not represent possible table columns',
      action : {}
    }
  }
  var text = "";
  var missingMap = categories.filter( category =>  columns.indexOf(category) < 0 );
  var usedMap = categories.filter( category =>  columns.indexOf(category) >= 0);
  if(missingMap.length) {
    text = "I had to drop " + Utils.listToQuotedCommaAnd(missingMap) + ". But here you go ...\n"
  }
  text += "Creating and starting table with "+ Utils.listToQuotedCommaAnd(usedMap);
  return {
    text : text,
  action :{ url : `table_${domain.toLowerCase().replace(/[^a-z0-9_]/g,'_')}?c${indexMap.join(',')}` }
  };
}
