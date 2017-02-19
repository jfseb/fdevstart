// import * as dlsh from '../../src/ts/utils/damerauLevenshtein.js'

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var DialogLogger = require(root + '/utils/dialoglogger.js');

//var dlsh = dl.levenshteinDamerau;

var debug = require('debug');
const debuglog = debug('dialoglogger.nunit');



exports.testLogger = function (test) {
  test.expect(4);

  var cA1 = undefined;
  var cA2 = undefined;
  var fakePG = {
    connect : function(o, fn) {
      debuglog('connect called');
      fn(undefined /*undef*/,
        {
          query : function(qa1,qa2, fn) {
            debuglog('queryy called');
            cA1 = qa1;
            cA2 = qa2;
            fn(undefined, {
              a: 1234
            }
          );
          }
        }, function(err,o) {
          debuglog('done');
          test.equal(2,2);
          //test.done();
        }
        );
    }
  };

/*
 botid : (session.message && session.message.address && session.message.address.bot && session.message.address.bot.id ) || this.name,
    userid: session.message.address
    && session.message.address.user
    && session.message.address.user.id || "",
    message: session.message.text,
    response : answer.response,
    action : answer.action,

    intent: answer.intent,

    conversationid: session.message.address
    && session.message.address.conversation
    && session.message.address.conversation.id || "",
*/

  var answer = {
    session : {
      message : {
        timestamp : new Date().toISOString(),
        address : {
          user : 'theUSER',
          conversation : {
            id : 'TheID'
          }
        }
      }
    },
    intent : 'AnIntent',
    response : 'TheResponse',
    action : 'TheAction'
  };
  /*
  session : builder.Session,
  intent : string,
  response : string,
  action? : string,
  result? : any,
  */

  DialogLogger.logger('LOGID','theurl', fakePG)(
     answer,
    function(err, res) {
      debuglog('callback');
      test.equal(1,1);
      test.deepEqual(cA1,
      'INSERT INTO logconv (botid,userid,message,response,action,intent,conversationid,meta,delta) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9)'
      , 'correct query');
      cA2[8] = 1234;
      test.deepEqual(cA2, [ 'LOGID',
        '',
        'undefined',
        'TheResponse',
        'TheAction',
        'AnIntent',
        'TheID',
  {},
        1234 ], 'correct query 2');
      test.done();
    },
    true
  );
};

exports.testLoggerInactive = function (test) {
  test.expect(1);
  var fakePG = {
    connect : function(o, fn) {
      throw new Error('abc');
    }
  };

  var answer = {
    session : {
      message : {
        address : {
          user : 'theUSER',
          conversation : {
            id : 'TheID'
          }
        }
      }
    },
    intent : 'AnIntent',
    response : 'TheResponse',
    action : 'TheAction'
  };
  /*
  session : builder.Session,
  intent : string,
  response : string,
  action? : string,
  result? : any,
  */

  DialogLogger.logger('LOGID','theurl', fakePG)(
     answer,
    function(err, res) {
      debuglog('done');
      throw new Error('never here');
    }
  );
  test.equal(1,1);
  test.done();
};



/*



export function logAnswer(answer: IAnswer, callback : (err: any, res?: any) => void ) {
  "use strict";
  callback = callback || (function() {});
  var session = answer.session;
  var pg = this.pg;
  debuglog("here user id of message session.message.address " +
  JSO
  // test.expect(3);
  test.deepEqual(fn('abcdef', '').toFixed(2), '0.63', 'empty b');
  test.deepEqual(fn('', '').toFixed(2), '1.00', 'both empty');
  test.deepEqual(fn('abc', 'abc').toFixed(2), '1.00', 'a is a');
  test.deepEqual(fn('', 'abc').toFixed(2), '0.63', ' empty a');
  test.deepEqual(fn('abcdef', 'abcde').toFixed(2),  '0.98', 'a is a');
  test.deepEqual(fn('abcdef', 'abcdef').toFixed(2),  '1.00', 'a is a');
  test.deepEqual(fn('hijk', 'abcd').toFixed(2), '0.41', 'a is a');
  test.deepEqual(fn('fabcde', 'abcdef').toFixed(2), '0.93', 'shift');
  test.deepEqual(fn('abc', 'acb').toFixed(2), '0.77', ' abc acb');
  test.deepEqual(fn('Shell.controller.js', 'Shell').toFixed(2), '0.58', 'Shell.controller.js, Shell');
  test.deepEqual(fn('Emma3', 'Shell').toFixed(2), '0.40', ' Emma3, Shell');
  test.done();
};
*/
