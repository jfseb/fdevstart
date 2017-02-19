


import * as IMatch from './ifmatch';
import * as pg from 'pg';
import * as debug from 'debug';

const debuglog = debug('indexwords');

var pgInstance = pg;

export function mockPG(pg) {
  pgInstance = pg;
}

var columns = ['lowercaseword', 'matchedstring', 'category'];
export function insertWord(dburl : string,lowercaseword : string, matchedstring : string, category: string, callback : (err: Error, res? : boolean) => void ) {
  pgInstance.connect(dburl, (err, client : pg.Client, pgDone) => {
      var oEntry =  {
        matchedstring : matchedstring,
        lowercaseword : lowercaseword,
        category : category
      }
      if (err) {
        // failed to acquire connection
        //logger.emit('error', err);
        debuglog('Error connecting to db' + err);
        callback(err);
      } else {
        var query =`INSERT INTO words (` + columns.join(",") + ") " +
        //   (convid, sessionid, user, message, response, meta) ` +
        "VALUES ( "  +
        // $1, $2, ...
         columns.map(function(o,iIndex) { return "$" + (iIndex+1); }).join(", ") + ")";

        var values = columns.map(function(sCol) {
             return oEntry[sCol];
           });
           //  [level, msg, meta instanceof Array ? JSON.stringify(meta) : meta],
        client.query(query,values,
                     (err, result) => {
            pgDone();
            if (err) {
             // logger.emit('error', err);
             debuglog('Error inserting record into db ' + err + '\n' +
                values.join("\n"));
              callback(err);
            } else {
            //  logger.emit('logged');
              callback(null, true);
            }
        });
      }
    });
}


export function dumpWords(dburl : string,  model: IMatch.IModels) {
  // move
  model.mRules.forEach(function(mRule) {
    if(mRule.type === IMatch.EnumRuleType.WORD) {
      insertWord(dburl, mRule.lowercaseword, mRule.matchedString, mRule.category, function() {});
    }
  });

}