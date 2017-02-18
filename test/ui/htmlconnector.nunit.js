/**
 * @file inputFilter
 * @copyright (c) 2016-2016 Gerd Forstmann
 */


/* eslint-disable */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

const HtmlConnector = require(root + '/ui/htmlconnector.js');

exports.testWithIdHook = function (test) {

  var out = new HtmlConnector.HTMLConnector({ user : "auser", bot : "bbot"});

  var hook1 = { a : 0, cnt : 0};
  out.setAnswerHook(function (a,b,c) {
    hook1.a = a;
    hook1.b = b,
    hook1.c = c;
    hook1.cnt += 1;
  },"id1");
  var hook2 = { a : 0, cnt : 0};
  out.setAnswerHook(function (a,b,c) {
    hook2.a = a;
    hook2.b = b;
    hook2.c = c;
    hook2.cnt += 1;
  },"id2");

  var hookNoID = { a : 0, cnt : 0};
  out.setAnswerHook(function (a,b,c) {
    hookNoID.a = a;
    hookNoID.b = b;
    hookNoID.c = c;
    hookNoID.cnt += 1;
  });



  out.setQuitHook(function(o) {
    throw new Error("never called");
  });

  var hook3 = { a : 0, cnt : 0};
  out.onEvent(function(arg) {
    hook3.a = arg;
    hook3.cnt += 1;
  });


  out.processMessage("this is the line", { user : "auser", "conversationid" : "convid"});
  //console.log("msg : " + JSON.stringify(hook3.a, undefined, 2));
  test.deepEqual(hook3.cnt, 1);
  hook3.a[0].timestamp = "TSXXX"
  test.deepEqual(hook3.a,  [
  {
    "type": "message",
    "agent": "botbuilder",
    "address": {
      "channelId": "console",
      "user": {
        "id": "auser",
        "name": "auser"
      },
      "bot": {
        "id": "bbot",
        "name": "bbot"
      },
      "conversation": {
        "id": "convid"
      }
    },
    "source": "console",
    "timestamp": "TSXXX",
    "text": "this is the line"
  }
]);

  test.deepEqual(hook3.a[0].address.user, { id :"auser", name : "auser"});
  test.deepEqual(hook3.a[0].address.conversation.id, "convid");


  // send to id2
  out.processMessage("this is the line2", "id2");

  test.deepEqual(hook1.cnt, 0, "hook1 was not called");
  test.deepEqual(hook2.cnt, 0, "hook2 was not called");

  test.deepEqual(hook3.a[0].address.user, { id :"id2", name : "id2"});
  test.deepEqual(hook3.a[0].address.conversation.id, "id2");

 hook3.a[0].timestamp = "TSXXX"
  test.deepEqual(hook3.a,  [
  {
    "type": "message",
    "agent": "botbuilder",
    "address": {
      "channelId": "console",
      "user": {
        "id": "id2",
        "name": "id2"
      },
      "bot": {
        "id": "bbot",
        "name": "bbot"
      },
      "conversation": {
        "id": "id2"
      }
    },
    "source": "console",
    "timestamp": "TSXXX",
    "text": "this is the line2"
  }
]);









  var hookDone = { a : undefined, cnt : 0};

  out.send({}, function(a) {
    hookDone.a = a;
    hookDone.cnt += 1;

  });
  test.deepEqual(hookDone.cnt, 1, 'done called');
  test.deepEqual(hookDone.a, null);
  test.deepEqual(hook1.cnt, 0, 'hook 1 called ');
  test.deepEqual(hook2.cnt, 0, 'hook 2 called');


  // sending messages:
  // a) with id and command
  var msg = {
    text : "here text",
    entities : ["entity0"],
    address : { conversation : { id  : "id2" } }
  }

  hook2 = { a : 0, cnt : 0};
  out.send([msg], function(a) {
    hookDone.a = a;
    hookDone.cnt += 1;

  });
  test.deepEqual(hookDone.cnt, 2, 'done called');
  test.deepEqual(hookDone.a, null);
  test.deepEqual(hook1.cnt, 0, 'hook 1 called ');
  test.deepEqual(hook2.cnt, 1, 'hook 2 called');
  test.deepEqual(hook2.a, "here text", ' here text');
  test.deepEqual(hook2.b, "entity0", 'the command');



 // send no id
  msg = {
    text : "here text2",
    entities : ["entity2"],
    address : { conversation : {  } }
  }
  out.send([msg],function(a) {
    hookDone.a = a;
    hookDone.cnt += 1;
  });


  test.deepEqual(hook2.cnt, 1), 'hook 2 called';
  test.deepEqual(hookNoID.cnt, 1);

  test.deepEqual(hookNoID.a, "here text2");
  test.deepEqual(hookNoID.b, "entity2");
  test.deepEqual(hookNoID.c);

  test.deepEqual(hookDone.cnt, 3);
  test.deepEqual(hookDone.a, null);

  test.done();
};
