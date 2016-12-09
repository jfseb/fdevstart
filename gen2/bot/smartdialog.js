/**
 * The bot implementation
 *
 * Instantiate apssing a connector via
 * makeBot
 *
 */
/**
 * @file
 * @module jfseb.fdevstart.smartdialog
 * @copyright (c) 2016 Gerd Forstmann
 */
//declare module 'elizabot' { };
"use strict";

var builder = require('botbuilder');
var debug = require('debug');
var Exec = require('../exec/exec');
var Match = require('../match/match');
var Analyze = require('../match/analyze');
var elizabot = require('elizabot');
//import * as elizabot from 'elizabot';
var debuglog = debug('smartdialog');
var PlainRecognizer = require('./plainrecognizer');
//var builder = require('botbuilder');
var dispatcher = require('../match/dispatcher.js').dispatcher;
function getConversationId(session) {
    return session.message && session.message.address && session.message.address.conversation.id;
}
var elizabots = {};
function getElizaBot(id) {
    if (!elizabots[id]) {
        elizabots[id] = {
            access: new Date(),
            elizabot: new elizabot()
        };
    }
    elizabots[id].access = new Date();
    return elizabots[id].elizabot;
}
var Tools = require('../match/tools');
var tools = Tools.getTools();
var InputFilterRules = require('../match/inputFilterRules.js');
var mRules = InputFilterRules.getMRulesSample();
var SimpleRecognizer = function () {
    function SimpleRecognizer() {}
    SimpleRecognizer.prototype.recognize = function (context, callback) {
        var u = {};
        console.log("recognizing " + context.message.text);
        if (context.message.text.indexOf("start") >= 0) {
            u.intent = "ShowEntity";
            u.score = 0.9;
            var e1 = {};
            e1.startIndex = "start ".length;
            e1.endIndex = context.message.text.length;
            e1.score = 0.3;
            u.entities = [e1];
            callback(undefined, u);
            return;
        }
        if (context.message.text.indexOf("train") >= 0) {
            u.intent = "train";
            u.score = 0.9;
            var e1 = {};
            e1.startIndex = "train ".length;
            e1.endIndex = context.message.text.length;
            e1.score = 0.3;
            u.entities = [e1];
            callback(undefined, u);
            return;
        }
        if (context.message.text.indexOf("learn") >= 0) {
            u.intent = "learn";
            u.score = 0.9;
            var e1 = {};
            e1.type = "trainFact";
            e1.startIndex = "train ".length;
            e1.endIndex = context.message.text.length;
            e1.score = 0.3;
            u.entities = [e1];
            callback(undefined, u);
            return;
        }
        if (context.message.text.indexOf("help") >= 0) {
            u.intent = "help";
            u.score = 0.9;
            var e1 = {};
            e1.startIndex = "train ".length;
            e1.endIndex = context.message.text.length;
            e1.score = 0.3;
            u.entities = [e1];
            callback(undefined, u);
            return;
        }
        if (context.message.text.indexOf("exit") >= 0) {
            u.intent = "exit";
            u.score = 0.9;
            var e1 = {};
            e1.startIndex = "exit ".length;
            e1.endIndex = context.message.text.length;
            e1.score = 0.3;
            u.entities = [e1];
            callback(undefined, u);
            return;
        }
        if (context.message.text.indexOf("wrong") >= 0) {
            u.intent = "wrong";
            u.score = 0.9;
            var e1 = {};
            e1.startIndex = "exit ".length;
            e1.endIndex = context.message.text.length;
            e1.score = 0.3;
            u.entities = [e1];
            callback(undefined, u);
            return;
        }
        console.log('recognizing nothing');
        u.intent = "None";
        u.score = 0.1;
        var e1 = {};
        e1.startIndex = "exit ".length;
        e1.endIndex = context.message.text.length;
        e1.score = 0.1;
        u.entities = [];
        callback(undefined, u);
    };
    return SimpleRecognizer;
}();
var SimpleUpDownRecognizer = function () {
    function SimpleUpDownRecognizer() {}
    SimpleUpDownRecognizer.prototype.recognize = function (context, callback) {
        var u = {};
        console.log("recognizing " + context.message.text);
        if (context.message.text.indexOf("down") >= 0) {
            u.intent = "intent.down";
            u.score = 0.9;
            var e1 = {};
            e1.startIndex = "start ".length;
            e1.endIndex = context.message.text.length;
            e1.score = 0.3;
            u.entities = [e1];
            callback(undefined, u);
            return;
        }
        if (context.message.text.indexOf("up") >= 0) {
            u.intent = "intent.up";
            u.score = 0.9;
            var e1 = {};
            e1.startIndex = "up".length;
            e1.endIndex = context.message.text.length;
            e1.score = 0.3;
            u.entities = [e1];
            callback(undefined, u);
            return;
        }
        console.log('recognizing nothing');
        u.intent = "None";
        u.score = 0.1;
        var e1 = {};
        e1.startIndex = "exit ".length;
        e1.endIndex = context.message.text.length;
        e1.score = 0.1;
        u.entities = [];
        callback(undefined, u);
    };
    return SimpleUpDownRecognizer;
}();
var AnyObject = Object;
// globalTunnel.initialize({
//  host: 'proxy.exxxample.com',
//  port: 8080
// })
// Create bot and bind to console
// var connector = new htmlconnector.HTMLConnector()
// connector.setAnswerHook(function (sAnswer) {
//  console.log('Got answer : ' + sAnswer + '\n')
// })
var bot;
// setTimeout(function () {
//   connector.processMessage('start unit test ABC ')
// }, 5000)
var fs = require('fs');
var oJSON = JSON.parse('' + fs.readFileSync('./resources/model/intents.json'));
var oRules = PlainRecognizer.parseRules(oJSON);
// var Recognizer = new (recognizer.RegExpRecognizer)(oRules);
function logQuery(session, intent, result) {
    fs.appendFile('./logs/showmequeries.txt', "\n" + JSON.stringify({
        text: session.message.text,
        timestamp: session.message.timestamp,
        intent: intent,
        res: result && result.length && Match.ToolMatch.dumpNice(result[0]) || "0",
        conversationId: session.message.address && session.message.address.conversation && session.message.address.conversation.id || "",
        userid: session.message.address && session.message.address.user && session.message.address.user.id || ""
    }), function (err, res) {
        if (err) {
            debuglog("logging failed " + err);
        }
    });
}
/**
 * Construct a bot
 * @param connector {Connector} the connector to use
 * HTMLConnector
 * or connector = new builder.ConsoleConnector().listen()
 */
function makeBot(connector) {
    bot = new builder.UniversalBot(connector);
    // Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Cortana Bot.
    // var model = sensitive.modelurl;
    // var model = 'https://api.projectoxford.ai/luis/v2.0/apps/c413b2ef-382c-45bd-8ff0-f76d60e2a821?subscription-key=c21398b5980a4ce09f474bbfee93b892&q='
    var recognizer = new PlainRecognizer.RegExpRecognizer(oRules);
    var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
    // dialog.onBegin(function(session,args) {
    // console.log("beginning ...")
    // session.dialogData.retryPrompt = args && args.retryPrompt || "I am sorry"
    // session.send("What do you want?")
    //
    // })
    var dialogUpDown = new builder.IntentDialog({ recognizers: [new SimpleUpDownRecognizer()] });
    bot.dialog('/updown', dialogUpDown);
    dialogUpDown.onBegin(function (session) {
        session.send("Hi there, updown is waiting for you");
    });
    dialogUpDown.matches('intent.up', [function (session, args, next) {
        session.dialogData.abc = args || {};
        builder.Prompts.text(session, 'you want to go up');
    }, function (session, results, next) {
        session.dialogData.abc = results.reponse;
        next();
    }, function (session, results) {
        session.endDialogWithResult({ response: session.dialogData.abc });
    }]);
    dialogUpDown.matches('intent.down', [function (session, args, next) {
        session.dialogData.abc = args || {};
        builder.Prompts.text(session, 'you want to go down!');
    }, function (session, results, next) {
        session.dialogData.abc = -1; // results.reponse;
        next();
    }, function (session, results) {
        session.send("still going down?");
    }]);
    dialogUpDown.onDefault(function (session) {
        logQuery(session, "onDefault");
        session.send("You are trapped in a dialog which only understands up and down, one of them will get you out");
        //builder.DialogAction.send('I\'m sorry I didn\'t understand. I can only show start and ring');
    });
    bot.dialog('/train', [function (session, args, next) {
        session.dialgoData.abc = args || {};
        builder.Prompts.text(session, 'Do you want to train me');
    }, function (session, results, next) {
        session.dialogData.abc = results.reponse;
    }, function (session, results) {
        session.endDialogWithResult({ response: session.DialogData.abc });
    }]);
    bot.dialog('/', dialog);
    dialog.matches('ShowMe', [function (session, args, next) {
        var isCombinedIndex = {};
        var oNewEntity;
        // expecting entity A1
        debuglog("Show Entity");
        console.log('raw: ' + JSON.stringify(args.entities), undefined, 2);
        var a1 = builder.EntityRecognizer.findEntity(args.entities, 'A1');
        /*
              var client = builder.EntityRecognizer.findEntity(args.entities, 'client');
              var systemObjectId = builder.EntityRecognizer.findEntity(combinedEntities, 'systemObjectId') ||
                builder.EntityRecognizer.findEntity(combinedEntities, 'SystemObject') ||
                builder.EntityRecognizer.findEntity(combinedEntities, 'builtin.number');
              var systemObjectCategory = builder.EntityRecognizer.findEntity(args.entities, 'SystemObjectCategory');
                     session.dialogData.system = {
                systemId: systemId,
                client: client
              };
        */
        /*
              var sSystemId = systemId && systemId.entity;
              var sClient = client && client.entity;
              var ssystemObjectId = systemObjectId && systemObjectId.entity;
              var sSystemObjectCategory = systemObjectCategory && systemObjectCategory.entity;
        */
        var result = Analyze.analyzeAll(a1.entity, mRules, tools);
        logQuery(session, 'ShowMe', result);
        // test.expect(3)
        //  test.deepEqual(result.weight, 120, 'correct weight');
        if (!result || result.length === 0) {
            next();
        }
        // debuglog('result : ' + JSON.stringify(result, undefined, 2));
        debuglog('best result : ' + JSON.stringify(result[0] || {}, undefined, 2));
        debuglog('top : ' + Match.ToolMatch.dumpWeightsTop(result, { top: 3 }));
        if (Analyze.isComplete(result[0])) {
            session.dialogData.result = result[0];
            session.send('Showing entity ...');
            next();
        } else if (Analyze.getPrompt(result[0])) {
            var prompt = Analyze.getPrompt(result[0]);
            session.dialogData.result = result[0];
            session.dialogData.prompt = prompt;
            session.send("Not enough information supplied: " + Match.ToolMatch.dumpNice(session.dialogData.result));
            builder.Prompts.text(session, prompt.text);
        } else {
            var best = result.length ? Match.ToolMatch.dumpNice(result[0]) : "<nothing>";
            //session.send('I did not understand this' + best);
            var reply = new builder.Message(session).text('I did not understand this' + best).addEntity({ url: "I don't know" });
            // .addAttachment({ fallbackText: "I don't know", contentType: 'image/jpeg', contentUrl: "www.wombat.org" });
            session.send(reply);
        }
        /*
              console.log('Show entities: ' + JSON.stringify(args.entities, undefined, 2));
                     // do the big analyis ...
                    var u = dispatcher.execShowEntity({
                systemId: sSystemId,
                client: sClient,
                tool: sTool,
                systemObjectCategory: sSystemObjectCategory,
                systemObjectId: ssystemObjectId
              })
        */
        //  session.send('Showing entity ...');
        //  console.log("show entity, Show session : " + JSON.stringify(session))
        // console.log("Show entity : " + JSON.stringify(args.entities))
    }, function (session, results, next) {
        var result = session.dialogData.result;
        if (!result || result.length === 0) {
            next();
        }
        if (results.response) {
            // some prompting
            Analyze.setPrompt(session.dialogData.result, session.dialogData.prompt, results.response);
        }
        if (Analyze.isComplete(session.dialogData.result)) {
            next();
        } else if (Analyze.getPrompt(session.dialogData.result)) {
            var prompt = Analyze.getPrompt(session.dialogData.result);
            session.dialogData.prompt = prompt;
            builder.Prompts.text(session, prompt.text);
        }
    }, function (session, results, next) {
        var result = session.dialogData.result;
        if (results.response) {
            // some prompting
            Analyze.setPrompt(session.dialogData.result, session.dialogData.prompt, results.response);
        }
        if (Analyze.isComplete(session.dialogData.result)) {
            //
            //session.send("starting  > " +
            var exec = Exec.execTool(session.dialogData.result);
            var reply = new builder.Message(session).text(exec.text).addEntity(exec.action);
            // .addAttachment({ fallbackText: "I don't know", contentType: 'image/jpeg', contentUrl: "www.wombat.org" });
            session.send(reply);
        } else {
            if (session.dialogData.result) {
                session.send("Not enough information supplied: " + Match.ToolMatch.dumpNice(session.dialogData.result));
            } else {
                session.send("I did not get what you want");
            }
        }
    }]);
    dialog.matches('Wrong', [function (session, args, next) {
        session.beginDialog('/updown', session.userData.count);
    }, function (session, results, next) {
        var alarm = session.dialogData.alarm;
        session.send("back from wrong : " + JSON.stringify(results));
        next();
    }, function (session, results) {
        session.send('end of wrong');
    }]);
    dialog.matches('Exit', [function (session, args, next) {
        console.log('exit :');
        console.log('exit' + JSON.stringify(args.entities));
        session.send("you are in a logic loop ");
    }]);
    dialog.matches('Help', [function (session, args, next) {
        console.log('help :');
        console.log('help');
        session.send("I know about .... <categories>>");
    }]);
    // Add intent handlers
    dialog.matches('train', [function (session, args, next) {
        console.log('train');
        // Resolve and store any entities passed from LUIS.
        var title = builder.EntityRecognizer.findEntity(args.entities, 'builtin.alarm.title');
        var time = builder.EntityRecognizer.resolveTime(args.entities);
        var alarm = session.dialogData.alarm = {
            title: title ? title.entity : null,
            timestamp: time ? time.getTime() : null
        };
        // Prompt for title
        if (!alarm.title) {
            builder.Prompts.text(session, 'What fact would you like to train?');
        } else {
            next();
        }
    }, function (session, results, next) {
        var alarm = session.dialogData.alarm;
        if (results.response) {
            alarm.title = results.response;
        }
        // Prompt for time (title will be blank if the user said cancel)
        if (alarm.title && !alarm.timestamp) {
            builder.Prompts.time(session, 'What time would you like to set the alarm for?');
        } else {
            next();
        }
    }, function (session, results) {
        var alarm = session.dialogData.alarm;
        if (results.response) {
            var time = builder.EntityRecognizer.resolveTime([results.response]);
            alarm.timestamp = time ? time.getTime() : null;
        }
        // Set the alarm (if title or timestamp is blank the user said cancel)
        if (alarm.title && alarm.timestamp) {
            // Save address of who to notify and write to scheduler.
            alarm.address = session.message.address;
            //alarms[alarm.title] = alarm;
            // Send confirmation to user
            var date = new Date(alarm.timestamp);
            var isAM = date.getHours() < 12;
            session.send('Creating alarm named "%s" for %d/%d/%d %d:%02d%s', alarm.title, date.getMonth() + 1, date.getDate(), date.getFullYear(), isAM ? date.getHours() : date.getHours() - 12, date.getMinutes(), isAM ? 'am' : 'pm');
        } else {
            session.send('Ok... no problem.');
        }
    }]);
    dialog.onDefault(function (session) {
        logQuery(session, "onDefault");
        var eliza = getElizaBot(getConversationId(session));
        var reply = eliza.transform(session.message.text);
        session.send(reply);
        //new Eilzabot
        //session.send("I do not understand this at all");
        //builder.DialogAction.send('I\'m sorry I didn\'t understand. I can only show start and ring');
    });
    /*
    // Very simple alarm scheduler
    var alarms = {};
    setInterval(function () {
      var now = new Date().getTime();
      for (var key in alarms) {
        var alarm = alarms[key];
        if (now >= alarm.timestamp) {
          var msg = new builder.Message()
            .address(alarm.address)
            .text('Here\'s your \'%s\' alarm.', alarm.title);
          bot.send(msg);
          delete alarms[key];
        }
      }
    }, 15000);
    */
}
if (module) {
    module.exports = {
        makeBot: makeBot
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9ib3Qvc21hcnRkaWFsb2cudHMiLCJib3Qvc21hcnRkaWFsb2cuanMiXSwibmFtZXMiOlsiYnVpbGRlciIsInJlcXVpcmUiLCJkZWJ1ZyIsIkV4ZWMiLCJNYXRjaCIsIkFuYWx5emUiLCJlbGl6YWJvdCIsImRlYnVnbG9nIiwiUGxhaW5SZWNvZ25pemVyIiwiZGlzcGF0Y2hlciIsImdldENvbnZlcnNhdGlvbklkIiwic2Vzc2lvbiIsIm1lc3NhZ2UiLCJhZGRyZXNzIiwiY29udmVyc2F0aW9uIiwiaWQiLCJlbGl6YWJvdHMiLCJnZXRFbGl6YUJvdCIsImFjY2VzcyIsIkRhdGUiLCJUb29scyIsInRvb2xzIiwiZ2V0VG9vbHMiLCJJbnB1dEZpbHRlclJ1bGVzIiwibVJ1bGVzIiwiZ2V0TVJ1bGVzU2FtcGxlIiwiU2ltcGxlUmVjb2duaXplciIsInByb3RvdHlwZSIsInJlY29nbml6ZSIsImNvbnRleHQiLCJjYWxsYmFjayIsInUiLCJjb25zb2xlIiwibG9nIiwidGV4dCIsImluZGV4T2YiLCJpbnRlbnQiLCJzY29yZSIsImUxIiwic3RhcnRJbmRleCIsImxlbmd0aCIsImVuZEluZGV4IiwiZW50aXRpZXMiLCJ1bmRlZmluZWQiLCJ0eXBlIiwiU2ltcGxlVXBEb3duUmVjb2duaXplciIsIkFueU9iamVjdCIsIk9iamVjdCIsImJvdCIsImZzIiwib0pTT04iLCJKU09OIiwicGFyc2UiLCJyZWFkRmlsZVN5bmMiLCJvUnVsZXMiLCJwYXJzZVJ1bGVzIiwibG9nUXVlcnkiLCJyZXN1bHQiLCJhcHBlbmRGaWxlIiwic3RyaW5naWZ5IiwidGltZXN0YW1wIiwicmVzIiwiVG9vbE1hdGNoIiwiZHVtcE5pY2UiLCJjb252ZXJzYXRpb25JZCIsInVzZXJpZCIsInVzZXIiLCJlcnIiLCJtYWtlQm90IiwiY29ubmVjdG9yIiwiVW5pdmVyc2FsQm90IiwicmVjb2duaXplciIsIlJlZ0V4cFJlY29nbml6ZXIiLCJkaWFsb2ciLCJJbnRlbnREaWFsb2ciLCJyZWNvZ25pemVycyIsImRpYWxvZ1VwRG93biIsIm9uQmVnaW4iLCJzZW5kIiwibWF0Y2hlcyIsImFyZ3MiLCJuZXh0IiwiZGlhbG9nRGF0YSIsImFiYyIsIlByb21wdHMiLCJyZXN1bHRzIiwicmVwb25zZSIsImVuZERpYWxvZ1dpdGhSZXN1bHQiLCJyZXNwb25zZSIsIm9uRGVmYXVsdCIsImRpYWxnb0RhdGEiLCJEaWFsb2dEYXRhIiwiaXNDb21iaW5lZEluZGV4Iiwib05ld0VudGl0eSIsImExIiwiRW50aXR5UmVjb2duaXplciIsImZpbmRFbnRpdHkiLCJhbmFseXplQWxsIiwiZW50aXR5IiwiZHVtcFdlaWdodHNUb3AiLCJ0b3AiLCJpc0NvbXBsZXRlIiwiZ2V0UHJvbXB0IiwicHJvbXB0IiwiYmVzdCIsInJlcGx5IiwiTWVzc2FnZSIsImFkZEVudGl0eSIsInVybCIsInNldFByb21wdCIsImV4ZWMiLCJleGVjVG9vbCIsImFjdGlvbiIsImJlZ2luRGlhbG9nIiwidXNlckRhdGEiLCJjb3VudCIsImFsYXJtIiwidGl0bGUiLCJ0aW1lIiwicmVzb2x2ZVRpbWUiLCJnZXRUaW1lIiwiZGF0ZSIsImlzQU0iLCJnZXRIb3VycyIsImdldE1vbnRoIiwiZ2V0RGF0ZSIsImdldEZ1bGxZZWFyIiwiZ2V0TWludXRlcyIsImVsaXphIiwidHJhbnNmb3JtIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7QUFPQTs7Ozs7QUFLQTtBQ0NBOztBRENBLElBQVlBLFVBQU9DLFFBQU0sWUFBTixDQUFuQjtBQUVBLElBQVlDLFFBQUtELFFBQU0sT0FBTixDQUFqQjtBQUVBLElBQVlFLE9BQUlGLFFBQU0sY0FBTixDQUFoQjtBQUNBLElBQVlHLFFBQUtILFFBQU0sZ0JBQU4sQ0FBakI7QUFFQSxJQUFZSSxVQUFPSixRQUFNLGtCQUFOLENBQW5CO0FBRUEsSUFBSUssV0FBV0wsUUFBUSxVQUFSLENBQWY7QUFDQTtBQUVBLElBQUlNLFdBQVdMLE1BQU0sYUFBTixDQUFmO0FBQ0EsSUFBWU0sa0JB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SUFBSXlCLE1BQUosRUFBWTtBQUNWQSxXQUFPQyxPQUFQLEdBQWlCO0FBQ2YvRCxpQkFBU0E7QUFETSxLQUFqQjtBQUdEIiwiZmlsZSI6ImJvdC9zbWFydGRpYWxvZy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVGhlIGJvdCBpbXBsZW1lbnRhdGlvblxuICpcbiAqIEluc3RhbnRpYXRlIGFwc3NpbmcgYSBjb25uZWN0b3IgdmlhXG4gKiBtYWtlQm90XG4gKlxuICovXG4vKipcbiAqIEBmaWxlXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5zbWFydGRpYWxvZ1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG4vL2RlY2xhcmUgbW9kdWxlICdlbGl6YWJvdCcgeyB9O1xuXG5pbXBvcnQgKiBhcyBidWlsZGVyIGZyb20gJ2JvdGJ1aWxkZXInO1xuXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5cbmltcG9ydCAqIGFzIEV4ZWMgZnJvbSAnLi4vZXhlYy9leGVjJztcbmltcG9ydCAqIGFzIE1hdGNoIGZyb20gJy4uL21hdGNoL21hdGNoJztcblxuaW1wb3J0ICogYXMgQW5hbHl6ZSBmcm9tICcuLi9tYXRjaC9hbmFseXplJztcblxudmFyIGVsaXphYm90ID0gcmVxdWlyZSgnZWxpemFib3QnKTtcbi8vaW1wb3J0ICogYXMgZWxpemFib3QgZnJvbSAnZWxpemFib3QnO1xuXG5sZXQgZGVidWdsb2cgPSBkZWJ1Zygnc21hcnRkaWFsb2cnKTtcbmltcG9ydCAqIGFzIFBsYWluUmVjb2duaXplciBmcm9tICcuL3BsYWlucmVjb2duaXplcic7XG4vL3ZhciBidWlsZGVyID0gcmVxdWlyZSgnYm90YnVpbGRlcicpO1xuXG52YXIgZGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL21hdGNoL2Rpc3BhdGNoZXIuanMnKS5kaXNwYXRjaGVyO1xuXG5cbmZ1bmN0aW9uIGdldENvbnZlcnNhdGlvbklkKHNlc3Npb24gOiBidWlsZGVyLlNlc3Npb24pIDogc3RyaW5nIHtcbiAgcmV0dXJuIHNlc3Npb24ubWVzc2FnZSAmJlxuICAgICAgICBzZXNzaW9uLm1lc3NhZ2UuYWRkcmVzcyAmJlxuICAgICAgICBzZXNzaW9uLm1lc3NhZ2UuYWRkcmVzcy5jb252ZXJzYXRpb24uaWQ7XG59XG5cbnZhciBlbGl6YWJvdHMgPSB7fTtcblxuZnVuY3Rpb24gZ2V0RWxpemFCb3QoaWQgOiBzdHJpbmcpIHtcbiAgaWYgKCFlbGl6YWJvdHNbaWRdKSB7XG4gICAgZWxpemFib3RzW2lkXSA9IHtcbiAgICAgIGFjY2VzcyA6IG5ldyBEYXRlKCksXG4gICAgICBlbGl6YWJvdCA6IG5ldyBlbGl6YWJvdCgpXG4gICAgfTtcbiAgfVxuICBlbGl6YWJvdHNbaWRdLmFjY2VzcyA9IG5ldyBEYXRlKCk7XG4gIHJldHVybiBlbGl6YWJvdHNbaWRdLmVsaXphYm90O1xufVxuXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvaWZtYXRjaCc7XG5pbXBvcnQgKiBhcyBUb29scyBmcm9tICcuLi9tYXRjaC90b29scyc7XG5cbmNvbnN0IHRvb2xzID0gVG9vbHMuZ2V0VG9vbHMoKTtcbmNvbnN0IElucHV0RmlsdGVyUnVsZXMgPSByZXF1aXJlKCcuLi9tYXRjaC9pbnB1dEZpbHRlclJ1bGVzLmpzJyk7XG5jb25zdCBtUnVsZXMgPSBJbnB1dEZpbHRlclJ1bGVzLmdldE1SdWxlc1NhbXBsZSgpO1xuXG5cblxuY2xhc3MgU2ltcGxlUmVjb2duaXplciBpbXBsZW1lbnRzIGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcblxuICB9XG5cbiAgcmVjb2duaXplKGNvbnRleHQ6IGJ1aWxkZXIuSVJlY29nbml6ZUNvbnRleHQsIGNhbGxiYWNrOiAoZXJyOiBFcnJvciwgcmVzdWx0OiBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdmFyIHUgPSB7fSBhcyBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0O1xuXG4gICAgY29uc29sZS5sb2coXCJyZWNvZ25pemluZyBcIiArIGNvbnRleHQubWVzc2FnZS50ZXh0KTtcbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInN0YXJ0XCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJTaG93RW50aXR5XCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwic3RhcnQgXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInRyYWluXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJ0cmFpblwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInRyYWluIFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwibGVhcm5cIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcImxlYXJuXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEudHlwZSA9IFwidHJhaW5GYWN0XCI7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImhlbHBcIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcImhlbHBcIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImV4aXRcIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcImV4aXRcIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwid3JvbmdcIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcIndyb25nXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygncmVjb2duaXppbmcgbm90aGluZycpO1xuICAgIHUuaW50ZW50ID0gXCJOb25lXCI7XG4gICAgdS5zY29yZSA9IDAuMTtcbiAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgZTEuc2NvcmUgPSAwLjE7XG4gICAgdS5lbnRpdGllcyA9IFtdO1xuICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gIH1cbn1cblxuXG5jbGFzcyBTaW1wbGVVcERvd25SZWNvZ25pemVyIGltcGxlbWVudHMgYnVpbGRlci5JSW50ZW50UmVjb2duaXplciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuXG4gIH1cblxuICByZWNvZ25pemUoY29udGV4dDogYnVpbGRlci5JUmVjb2duaXplQ29udGV4dCwgY2FsbGJhY2s6IChlcnI6IEVycm9yLCByZXN1bHQ6IGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXJSZXN1bHQpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB2YXIgdSA9IHt9IGFzIGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXJSZXN1bHQ7XG5cbiAgICBjb25zb2xlLmxvZyhcInJlY29nbml6aW5nIFwiICsgY29udGV4dC5tZXNzYWdlLnRleHQpO1xuICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiZG93blwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwiaW50ZW50LmRvd25cIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJzdGFydCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInVwXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJpbnRlbnQudXBcIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJ1cFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdyZWNvZ25pemluZyBub3RoaW5nJyk7XG4gICAgdS5pbnRlbnQgPSBcIk5vbmVcIjtcbiAgICB1LnNjb3JlID0gMC4xO1xuICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICBlMS5zY29yZSA9IDAuMTtcbiAgICB1LmVudGl0aWVzID0gW107XG4gICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgfVxufVxuXG5jb25zdCBBbnlPYmplY3QgPSBPYmplY3QgYXMgYW55O1xuLy8gZ2xvYmFsVHVubmVsLmluaXRpYWxpemUoe1xuLy8gIGhvc3Q6ICdwcm94eS5leHh4YW1wbGUuY29tJyxcbi8vICBwb3J0OiA4MDgwXG4vLyB9KVxuXG4vLyBDcmVhdGUgYm90IGFuZCBiaW5kIHRvIGNvbnNvbGVcbi8vIHZhciBjb25uZWN0b3IgPSBuZXcgaHRtbGNvbm5lY3Rvci5IVE1MQ29ubmVjdG9yKClcblxuLy8gY29ubmVjdG9yLnNldEFuc3dlckhvb2soZnVuY3Rpb24gKHNBbnN3ZXIpIHtcbi8vICBjb25zb2xlLmxvZygnR290IGFuc3dlciA6ICcgKyBzQW5zd2VyICsgJ1xcbicpXG4vLyB9KVxuXG52YXIgYm90O1xuLy8gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4vLyAgIGNvbm5lY3Rvci5wcm9jZXNzTWVzc2FnZSgnc3RhcnQgdW5pdCB0ZXN0IEFCQyAnKVxuLy8gfSwgNTAwMClcblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuXG52YXIgb0pTT04gPSBKU09OLnBhcnNlKCcnICsgZnMucmVhZEZpbGVTeW5jKCcuL3Jlc291cmNlcy9tb2RlbC9pbnRlbnRzLmpzb24nKSk7XG52YXIgb1J1bGVzID0gUGxhaW5SZWNvZ25pemVyLnBhcnNlUnVsZXMob0pTT04pO1xuLy8gdmFyIFJlY29nbml6ZXIgPSBuZXcgKHJlY29nbml6ZXIuUmVnRXhwUmVjb2duaXplcikob1J1bGVzKTtcblxuXG5mdW5jdGlvbiBsb2dRdWVyeShzZXNzaW9uIDogYnVpbGRlci5TZXNzaW9uLCBpbnRlbnQgOiBzdHJpbmcsIHJlc3VsdD8gOiBBcnJheTxJTWF0Y2guSVRvb2xNYXRjaD4pIHtcblxuICBmcy5hcHBlbmRGaWxlKCcuL2xvZ3Mvc2hvd21lcXVlcmllcy50eHQnLFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgdGV4dCA6IHNlc3Npb24ubWVzc2FnZS50ZXh0LFxuICAgICAgICAgIHRpbWVzdGFtcDogc2Vzc2lvbi5tZXNzYWdlLnRpbWVzdGFtcCxcbiAgICAgICAgICBpbnRlbnQgOiBpbnRlbnQsXG4gICAgICAgICAgcmVzIDogcmVzdWx0ICYmIHJlc3VsdC5sZW5ndGggJiYgTWF0Y2guVG9vbE1hdGNoLmR1bXBOaWNlKHJlc3VsdFswXSkgfHwgXCIwXCIsXG4gICAgICAgICAgY29udmVyc2F0aW9uSWQgOiBzZXNzaW9uLm1lc3NhZ2UuYWRkcmVzc1xuICAgICAgICAgICAgICYmIHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzLmNvbnZlcnNhdGlvblxuICAgICAgICAgICAgICYmIHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzLmNvbnZlcnNhdGlvbi5pZCB8fCBcIlwiLFxuICAgICAgICAgIHVzZXJpZCA6IHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzXG4gICAgICAgICAgICAgJiYgc2Vzc2lvbi5tZXNzYWdlLmFkZHJlc3MudXNlclxuICAgICAgICAgICAgICYmIHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzLnVzZXIuaWQgfHwgXCJcIlxuICAgICAgICB9KSwgZnVuY3Rpb24oZXJyLCByZXMpIHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcImxvZ2dpbmcgZmFpbGVkIFwiICsgZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuXG4vKipcbiAqIENvbnN0cnVjdCBhIGJvdFxuICogQHBhcmFtIGNvbm5lY3RvciB7Q29ubmVjdG9yfSB0aGUgY29ubmVjdG9yIHRvIHVzZVxuICogSFRNTENvbm5lY3RvclxuICogb3IgY29ubmVjdG9yID0gbmV3IGJ1aWxkZXIuQ29uc29sZUNvbm5lY3RvcigpLmxpc3RlbigpXG4gKi9cbmZ1bmN0aW9uIG1ha2VCb3QoY29ubmVjdG9yKSB7XG4gIGJvdCA9IG5ldyBidWlsZGVyLlVuaXZlcnNhbEJvdChjb25uZWN0b3IpO1xuXG5cblxuICAvLyBDcmVhdGUgTFVJUyByZWNvZ25pemVyIHRoYXQgcG9pbnRzIGF0IG91ciBtb2RlbCBhbmQgYWRkIGl0IGFzIHRoZSByb290ICcvJyBkaWFsb2cgZm9yIG91ciBDb3J0YW5hIEJvdC5cbiAgLy8gdmFyIG1vZGVsID0gc2Vuc2l0aXZlLm1vZGVsdXJsO1xuICAvLyB2YXIgbW9kZWwgPSAnaHR0cHM6Ly9hcGkucHJvamVjdG94Zm9yZC5haS9sdWlzL3YyLjAvYXBwcy9jNDEzYjJlZi0zODJjLTQ1YmQtOGZmMC1mNzZkNjBlMmE4MjE/c3Vic2NyaXB0aW9uLWtleT1jMjEzOThiNTk4MGE0Y2UwOWY0NzRiYmZlZTkzYjg5MiZxPSdcbiAgdmFyIHJlY29nbml6ZXIgPSBuZXcgUGxhaW5SZWNvZ25pemVyLlJlZ0V4cFJlY29nbml6ZXIob1J1bGVzKTtcblxuICB2YXIgZGlhbG9nID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFtyZWNvZ25pemVyXSB9KTtcbiAgLy8gZGlhbG9nLm9uQmVnaW4oZnVuY3Rpb24oc2Vzc2lvbixhcmdzKSB7XG4gIC8vIGNvbnNvbGUubG9nKFwiYmVnaW5uaW5nIC4uLlwiKVxuICAvLyBzZXNzaW9uLmRpYWxvZ0RhdGEucmV0cnlQcm9tcHQgPSBhcmdzICYmIGFyZ3MucmV0cnlQcm9tcHQgfHwgXCJJIGFtIHNvcnJ5XCJcbiAgLy8gc2Vzc2lvbi5zZW5kKFwiV2hhdCBkbyB5b3Ugd2FudD9cIilcbiAgLy9cbiAgLy8gfSlcblxuICB2YXIgZGlhbG9nVXBEb3duID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFtuZXcgU2ltcGxlVXBEb3duUmVjb2duaXplcigpXSB9KTtcblxuICBib3QuZGlhbG9nKCcvdXBkb3duJywgZGlhbG9nVXBEb3duKTtcbiAgZGlhbG9nVXBEb3duLm9uQmVnaW4oZnVuY3Rpb24gKHNlc3Npb24pIHtcbiAgICBzZXNzaW9uLnNlbmQoXCJIaSB0aGVyZSwgdXBkb3duIGlzIHdhaXRpbmcgZm9yIHlvdVwiKTtcbiAgfSlcblxuICBkaWFsb2dVcERvd24ubWF0Y2hlcygnaW50ZW50LnVwJywgW1xuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICd5b3Ugd2FudCB0byBnbyB1cCcpO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSByZXN1bHRzLnJlcG9uc2U7XG4gICAgICBuZXh0KCk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgc2Vzc2lvbi5lbmREaWFsb2dXaXRoUmVzdWx0KHsgcmVzcG9uc2U6IHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgfSk7XG4gICAgfVxuICBdXG4gICk7XG5cbiAgZGlhbG9nVXBEb3duLm1hdGNoZXMoJ2ludGVudC5kb3duJywgW1xuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICd5b3Ugd2FudCB0byBnbyBkb3duIScpO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSAtMTsgLy8gcmVzdWx0cy5yZXBvbnNlO1xuICAgICAgbmV4dCgpO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgIHNlc3Npb24uc2VuZChcInN0aWxsIGdvaW5nIGRvd24/XCIpO1xuICAgIH1cbiAgXVxuICApO1xuICBkaWFsb2dVcERvd24ub25EZWZhdWx0KGZ1bmN0aW9uKHNlc3Npb24pIHtcbiAgICBsb2dRdWVyeShzZXNzaW9uLCBcIm9uRGVmYXVsdFwiKTtcbiAgICBzZXNzaW9uLnNlbmQoXCJZb3UgYXJlIHRyYXBwZWQgaW4gYSBkaWFsb2cgd2hpY2ggb25seSB1bmRlcnN0YW5kcyB1cCBhbmQgZG93biwgb25lIG9mIHRoZW0gd2lsbCBnZXQgeW91IG91dFwiKTtcbiAgICAvL2J1aWxkZXIuRGlhbG9nQWN0aW9uLnNlbmQoJ0lcXCdtIHNvcnJ5IEkgZGlkblxcJ3QgdW5kZXJzdGFuZC4gSSBjYW4gb25seSBzaG93IHN0YXJ0IGFuZCByaW5nJyk7XG4gIH0pO1xuXG5cbiAgYm90LmRpYWxvZygnL3RyYWluJywgW1xuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICBzZXNzaW9uLmRpYWxnb0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdEbyB5b3Ugd2FudCB0byB0cmFpbiBtZScpO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSByZXN1bHRzLnJlcG9uc2U7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgc2Vzc2lvbi5lbmREaWFsb2dXaXRoUmVzdWx0KHsgcmVzcG9uc2U6IHNlc3Npb24uRGlhbG9nRGF0YS5hYmMgfSk7XG4gICAgfVxuICBdKTtcblxuXG4gIGJvdC5kaWFsb2coJy8nLCBkaWFsb2cpO1xuXG4gIGRpYWxvZy5tYXRjaGVzKCdTaG93TWUnLCBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIHZhciBpc0NvbWJpbmVkSW5kZXggPSB7fTtcbiAgICAgIHZhciBvTmV3RW50aXR5O1xuICAgICAgLy8gZXhwZWN0aW5nIGVudGl0eSBBMVxuICAgICAgZGVidWdsb2coXCJTaG93IEVudGl0eVwiKTtcbiAgICAgIGNvbnNvbGUubG9nKCdyYXc6ICcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzKSwgdW5kZWZpbmVkLCAyKTtcbiAgICAgIHZhciBhMSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdBMScpO1xuICAgICAgLypcbiAgICAgICAgICAgIHZhciBjbGllbnQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnY2xpZW50Jyk7XG4gICAgICAgICAgICB2YXIgc3lzdGVtT2JqZWN0SWQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnc3lzdGVtT2JqZWN0SWQnKSB8fFxuICAgICAgICAgICAgICBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnU3lzdGVtT2JqZWN0JykgfHxcbiAgICAgICAgICAgICAgYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ2J1aWx0aW4ubnVtYmVyJyk7XG4gICAgICAgICAgICB2YXIgc3lzdGVtT2JqZWN0Q2F0ZWdvcnkgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnU3lzdGVtT2JqZWN0Q2F0ZWdvcnknKTtcblxuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnN5c3RlbSA9IHtcbiAgICAgICAgICAgICAgc3lzdGVtSWQ6IHN5c3RlbUlkLFxuICAgICAgICAgICAgICBjbGllbnQ6IGNsaWVudFxuICAgICAgICAgICAgfTtcbiAgICAgICovXG4gICAgICAvKlxuICAgICAgICAgICAgdmFyIHNTeXN0ZW1JZCA9IHN5c3RlbUlkICYmIHN5c3RlbUlkLmVudGl0eTtcbiAgICAgICAgICAgIHZhciBzQ2xpZW50ID0gY2xpZW50ICYmIGNsaWVudC5lbnRpdHk7XG4gICAgICAgICAgICB2YXIgc3N5c3RlbU9iamVjdElkID0gc3lzdGVtT2JqZWN0SWQgJiYgc3lzdGVtT2JqZWN0SWQuZW50aXR5O1xuICAgICAgICAgICAgdmFyIHNTeXN0ZW1PYmplY3RDYXRlZ29yeSA9IHN5c3RlbU9iamVjdENhdGVnb3J5ICYmIHN5c3RlbU9iamVjdENhdGVnb3J5LmVudGl0eTtcbiAgICAgICovXG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IEFuYWx5emUuYW5hbHl6ZUFsbChhMS5lbnRpdHksXG4gICAgICAgIG1SdWxlcywgdG9vbHMpO1xuICAgICAgbG9nUXVlcnkoc2Vzc2lvbiwnU2hvd01lJyxyZXN1bHQpO1xuICAgICAgLy8gdGVzdC5leHBlY3QoMylcbiAgICAgIC8vICB0ZXN0LmRlZXBFcXVhbChyZXN1bHQud2VpZ2h0LCAxMjAsICdjb3JyZWN0IHdlaWdodCcpO1xuICAgICAgaWYoIXJlc3VsdCB8fCByZXN1bHQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH1cbiAgICAgIC8vIGRlYnVnbG9nKCdyZXN1bHQgOiAnICsgSlNPTi5zdHJpbmdpZnkocmVzdWx0LCB1bmRlZmluZWQsIDIpKTtcbiAgICAgIGRlYnVnbG9nKCdiZXN0IHJlc3VsdCA6ICcgKyBKU09OLnN0cmluZ2lmeShyZXN1bHRbMF0gfHwge30sIHVuZGVmaW5lZCwgMikpO1xuICAgICAgZGVidWdsb2coJ3RvcCA6ICcgKyBNYXRjaC5Ub29sTWF0Y2guZHVtcFdlaWdodHNUb3AocmVzdWx0LCB7IHRvcDogMyB9KSk7XG5cblxuICAgICAgaWYgKEFuYWx5emUuaXNDb21wbGV0ZShyZXN1bHRbMF0pKSB7XG4gICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQgPSByZXN1bHRbMF07XG4gICAgICAgIHNlc3Npb24uc2VuZCgnU2hvd2luZyBlbnRpdHkgLi4uJyk7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0gZWxzZSBpZiAoQW5hbHl6ZS5nZXRQcm9tcHQocmVzdWx0WzBdKSkge1xuICAgICAgICB2YXIgcHJvbXB0ID0gQW5hbHl6ZS5nZXRQcm9tcHQocmVzdWx0WzBdKTtcbiAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCA9IHJlc3VsdFswXTtcbiAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnByb21wdCA9IHByb21wdDtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKFwiTm90IGVub3VnaCBpbmZvcm1hdGlvbiBzdXBwbGllZDogXCIgKyBNYXRjaC5Ub29sTWF0Y2guZHVtcE5pY2UoXG4gICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdFxuICAgICAgICApKTtcbiAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgcHJvbXB0LnRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGJlc3QgPSByZXN1bHQubGVuZ3RoID8gTWF0Y2guVG9vbE1hdGNoLmR1bXBOaWNlKHJlc3VsdFswXSkgOiBcIjxub3RoaW5nPlwiO1xuICAgICAgICAvL3Nlc3Npb24uc2VuZCgnSSBkaWQgbm90IHVuZGVyc3RhbmQgdGhpcycgKyBiZXN0KTtcbiAgICAgICAgIHZhciByZXBseSA9XG4gICAgICBuZXcgYnVpbGRlci5NZXNzYWdlKHNlc3Npb24pXG4gICAgICAgICAgLnRleHQoJ0kgZGlkIG5vdCB1bmRlcnN0YW5kIHRoaXMnICsgYmVzdClcbiAgICAgICAgICAuYWRkRW50aXR5KHsgdXJsIDogXCJJIGRvbid0IGtub3dcIn0pO1xuICAgICAgICAgLy8gLmFkZEF0dGFjaG1lbnQoeyBmYWxsYmFja1RleHQ6IFwiSSBkb24ndCBrbm93XCIsIGNvbnRlbnRUeXBlOiAnaW1hZ2UvanBlZycsIGNvbnRlbnRVcmw6IFwid3d3LndvbWJhdC5vcmdcIiB9KTtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKHJlcGx5KTtcblxuICAgICAgfVxuXG4gICAgICAvKlxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1Nob3cgZW50aXRpZXM6ICcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzLCB1bmRlZmluZWQsIDIpKTtcblxuICAgICAgICAgICAgLy8gZG8gdGhlIGJpZyBhbmFseWlzIC4uLlxuICAgICAgICAgICAgICAgICAgdmFyIHUgPSBkaXNwYXRjaGVyLmV4ZWNTaG93RW50aXR5KHtcbiAgICAgICAgICAgICAgc3lzdGVtSWQ6IHNTeXN0ZW1JZCxcbiAgICAgICAgICAgICAgY2xpZW50OiBzQ2xpZW50LFxuICAgICAgICAgICAgICB0b29sOiBzVG9vbCxcbiAgICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6IHNTeXN0ZW1PYmplY3RDYXRlZ29yeSxcbiAgICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IHNzeXN0ZW1PYmplY3RJZFxuICAgICAgICAgICAgfSlcbiAgICAgICovXG5cbiAgICAgIC8vICBzZXNzaW9uLnNlbmQoJ1Nob3dpbmcgZW50aXR5IC4uLicpO1xuXG4gICAgICAvLyAgY29uc29sZS5sb2coXCJzaG93IGVudGl0eSwgU2hvdyBzZXNzaW9uIDogXCIgKyBKU09OLnN0cmluZ2lmeShzZXNzaW9uKSlcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwiU2hvdyBlbnRpdHkgOiBcIiArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpKVxuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgIHZhciByZXN1bHQgPSBzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0O1xuICAgICAgaWYoIXJlc3VsdCB8fCByZXN1bHQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgLy8gc29tZSBwcm9tcHRpbmdcbiAgICAgICAgQW5hbHl6ZS5zZXRQcm9tcHQoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCwgc2Vzc2lvbi5kaWFsb2dEYXRhLnByb21wdCwgcmVzdWx0cy5yZXNwb25zZSk7XG4gICAgICB9XG4gICAgICBpZiAoQW5hbHl6ZS5pc0NvbXBsZXRlKHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpKSB7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0gZWxzZSBpZiAoQW5hbHl6ZS5nZXRQcm9tcHQoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCkpIHtcbiAgICAgICAgdmFyIHByb21wdCA9IEFuYWx5emUuZ2V0UHJvbXB0KHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpO1xuICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEucHJvbXB0ID0gcHJvbXB0O1xuICAgICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCBwcm9tcHQudGV4dCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgdmFyIHJlc3VsdCA9IHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQ7XG4gICAgICBpZiAocmVzdWx0cy5yZXNwb25zZSkge1xuICAgICAgICAvLyBzb21lIHByb21wdGluZ1xuICAgICAgICBBbmFseXplLnNldFByb21wdChzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0LFxuICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5wcm9tcHQsIHJlc3VsdHMucmVzcG9uc2UpO1xuICAgICAgfVxuICAgICAgaWYgKEFuYWx5emUuaXNDb21wbGV0ZShzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0KSkge1xuICAgICAgICAvL1xuICAgICAgICAvL3Nlc3Npb24uc2VuZChcInN0YXJ0aW5nICA+IFwiICtcbiAgICAgICAgdmFyIGV4ZWMgPSBFeGVjLmV4ZWNUb29sKHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQgYXMgSU1hdGNoLklUb29sTWF0Y2gpO1xuICAgICAgICB2YXIgcmVwbHkgPSBuZXcgYnVpbGRlci5NZXNzYWdlKHNlc3Npb24pXG4gICAgICAgICAgLnRleHQoZXhlYy50ZXh0KVxuICAgICAgICAgIC5hZGRFbnRpdHkoZXhlYy5hY3Rpb24pO1xuICAgICAgICAgLy8gLmFkZEF0dGFjaG1lbnQoeyBmYWxsYmFja1RleHQ6IFwiSSBkb24ndCBrbm93XCIsIGNvbnRlbnRUeXBlOiAnaW1hZ2UvanBlZycsIGNvbnRlbnRVcmw6IFwid3d3LndvbWJhdC5vcmdcIiB9KTtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKHJlcGx5KTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpIHtcbiAgICAgICAgICBzZXNzaW9uLnNlbmQoXCJOb3QgZW5vdWdoIGluZm9ybWF0aW9uIHN1cHBsaWVkOiBcIiArIE1hdGNoLlRvb2xNYXRjaC5kdW1wTmljZShcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHRcbiAgICAgICAgICApKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZXNzaW9uLnNlbmQoXCJJIGRpZCBub3QgZ2V0IHdoYXQgeW91IHdhbnRcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICBdKTtcblxuICBkaWFsb2cubWF0Y2hlcygnV3JvbmcnLCBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uYmVnaW5EaWFsb2coJy91cGRvd24nLCBzZXNzaW9uLnVzZXJEYXRhLmNvdW50KTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm07XG4gICAgICBzZXNzaW9uLnNlbmQoXCJiYWNrIGZyb20gd3JvbmcgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJlc3VsdHMpKTtcbiAgICAgIG5leHQoKTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICBzZXNzaW9uLnNlbmQoJ2VuZCBvZiB3cm9uZycpO1xuICAgIH1cbiAgXSk7XG5cbiAgZGlhbG9nLm1hdGNoZXMoJ0V4aXQnLCBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdleGl0IDonKTtcbiAgICAgIGNvbnNvbGUubG9nKCdleGl0JyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpKTtcbiAgICAgIHNlc3Npb24uc2VuZChcInlvdSBhcmUgaW4gYSBsb2dpYyBsb29wIFwiKTtcbiAgICB9XG4gIF0pO1xuICBkaWFsb2cubWF0Y2hlcygnSGVscCcsIFtcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgY29uc29sZS5sb2coJ2hlbHAgOicpO1xuICAgICAgY29uc29sZS5sb2coJ2hlbHAnKTtcbiAgICAgIHNlc3Npb24uc2VuZChcIkkga25vdyBhYm91dCAuLi4uIDxjYXRlZ29yaWVzPj5cIik7XG4gICAgfVxuICBdKTtcblxuXG5cbiAgLy8gQWRkIGludGVudCBoYW5kbGVyc1xuICBkaWFsb2cubWF0Y2hlcygndHJhaW4nLCBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCd0cmFpbicpO1xuICAgICAgLy8gUmVzb2x2ZSBhbmQgc3RvcmUgYW55IGVudGl0aWVzIHBhc3NlZCBmcm9tIExVSVMuXG4gICAgICB2YXIgdGl0bGUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnYnVpbHRpbi5hbGFybS50aXRsZScpO1xuICAgICAgdmFyIHRpbWUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIucmVzb2x2ZVRpbWUoYXJncy5lbnRpdGllcyk7XG4gICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm0gPSB7XG4gICAgICAgIHRpdGxlOiB0aXRsZSA/IHRpdGxlLmVudGl0eSA6IG51bGwsXG4gICAgICAgIHRpbWVzdGFtcDogdGltZSA/IHRpbWUuZ2V0VGltZSgpIDogbnVsbFxuICAgICAgfTtcbiAgICAgIC8vIFByb21wdCBmb3IgdGl0bGVcbiAgICAgIGlmICghYWxhcm0udGl0bGUpIHtcbiAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ1doYXQgZmFjdCB3b3VsZCB5b3UgbGlrZSB0byB0cmFpbj8nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm07XG4gICAgICBpZiAocmVzdWx0cy5yZXNwb25zZSkge1xuICAgICAgICBhbGFybS50aXRsZSA9IHJlc3VsdHMucmVzcG9uc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIFByb21wdCBmb3IgdGltZSAodGl0bGUgd2lsbCBiZSBibGFuayBpZiB0aGUgdXNlciBzYWlkIGNhbmNlbClcbiAgICAgIGlmIChhbGFybS50aXRsZSAmJiAhYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50aW1lKHNlc3Npb24sICdXaGF0IHRpbWUgd291bGQgeW91IGxpa2UgdG8gc2V0IHRoZSBhbGFybSBmb3I/Jyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgdmFyIHRpbWUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIucmVzb2x2ZVRpbWUoW3Jlc3VsdHMucmVzcG9uc2VdKTtcbiAgICAgICAgYWxhcm0udGltZXN0YW1wID0gdGltZSA/IHRpbWUuZ2V0VGltZSgpIDogbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIFNldCB0aGUgYWxhcm0gKGlmIHRpdGxlIG9yIHRpbWVzdGFtcCBpcyBibGFuayB0aGUgdXNlciBzYWlkIGNhbmNlbClcbiAgICAgIGlmIChhbGFybS50aXRsZSAmJiBhbGFybS50aW1lc3RhbXApIHtcbiAgICAgICAgLy8gU2F2ZSBhZGRyZXNzIG9mIHdobyB0byBub3RpZnkgYW5kIHdyaXRlIHRvIHNjaGVkdWxlci5cbiAgICAgICAgYWxhcm0uYWRkcmVzcyA9IHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzO1xuICAgICAgICAvL2FsYXJtc1thbGFybS50aXRsZV0gPSBhbGFybTtcblxuICAgICAgICAvLyBTZW5kIGNvbmZpcm1hdGlvbiB0byB1c2VyXG4gICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoYWxhcm0udGltZXN0YW1wKTtcbiAgICAgICAgdmFyIGlzQU0gPSBkYXRlLmdldEhvdXJzKCkgPCAxMjtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKCdDcmVhdGluZyBhbGFybSBuYW1lZCBcIiVzXCIgZm9yICVkLyVkLyVkICVkOiUwMmQlcycsXG4gICAgICAgICAgYWxhcm0udGl0bGUsXG4gICAgICAgICAgZGF0ZS5nZXRNb250aCgpICsgMSwgZGF0ZS5nZXREYXRlKCksIGRhdGUuZ2V0RnVsbFllYXIoKSxcbiAgICAgICAgICBpc0FNID8gZGF0ZS5nZXRIb3VycygpIDogZGF0ZS5nZXRIb3VycygpIC0gMTIsIGRhdGUuZ2V0TWludXRlcygpLCBpc0FNID8gJ2FtJyA6ICdwbScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKCdPay4uLiBubyBwcm9ibGVtLicpO1xuICAgICAgfVxuICAgIH1cbiAgXSk7XG5cbiAgZGlhbG9nLm9uRGVmYXVsdChmdW5jdGlvbihzZXNzaW9uKSB7XG4gICAgbG9nUXVlcnkoc2Vzc2lvbiwgXCJvbkRlZmF1bHRcIik7XG4gICAgdmFyIGVsaXphID0gZ2V0RWxpemFCb3QoZ2V0Q29udmVyc2F0aW9uSWQoc2Vzc2lvbikpO1xuICAgIHZhciByZXBseSA9IGVsaXphLnRyYW5zZm9ybShzZXNzaW9uLm1lc3NhZ2UudGV4dCk7XG4gICAgc2Vzc2lvbi5zZW5kKHJlcGx5KTtcbiAgICAvL25ldyBFaWx6YWJvdFxuICAgIC8vc2Vzc2lvbi5zZW5kKFwiSSBkbyBub3QgdW5kZXJzdGFuZCB0aGlzIGF0IGFsbFwiKTtcbiAgICAvL2J1aWxkZXIuRGlhbG9nQWN0aW9uLnNlbmQoJ0lcXCdtIHNvcnJ5IEkgZGlkblxcJ3QgdW5kZXJzdGFuZC4gSSBjYW4gb25seSBzaG93IHN0YXJ0IGFuZCByaW5nJyk7XG4gIH0pO1xuXG4gIC8qXG4gIC8vIFZlcnkgc2ltcGxlIGFsYXJtIHNjaGVkdWxlclxuICB2YXIgYWxhcm1zID0ge307XG4gIHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgZm9yICh2YXIga2V5IGluIGFsYXJtcykge1xuICAgICAgdmFyIGFsYXJtID0gYWxhcm1zW2tleV07XG4gICAgICBpZiAobm93ID49IGFsYXJtLnRpbWVzdGFtcCkge1xuICAgICAgICB2YXIgbXNnID0gbmV3IGJ1aWxkZXIuTWVzc2FnZSgpXG4gICAgICAgICAgLmFkZHJlc3MoYWxhcm0uYWRkcmVzcylcbiAgICAgICAgICAudGV4dCgnSGVyZVxcJ3MgeW91ciBcXCclc1xcJyBhbGFybS4nLCBhbGFybS50aXRsZSk7XG4gICAgICAgIGJvdC5zZW5kKG1zZyk7XG4gICAgICAgIGRlbGV0ZSBhbGFybXNba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIDE1MDAwKTtcbiAgKi9cbn1cblxuaWYgKG1vZHVsZSkge1xuICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBtYWtlQm90OiBtYWtlQm90XG4gIH07XG59XG4iLCIvKipcbiAqIFRoZSBib3QgaW1wbGVtZW50YXRpb25cbiAqXG4gKiBJbnN0YW50aWF0ZSBhcHNzaW5nIGEgY29ubmVjdG9yIHZpYVxuICogbWFrZUJvdFxuICpcbiAqL1xuLyoqXG4gKiBAZmlsZVxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuc21hcnRkaWFsb2dcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuLy9kZWNsYXJlIG1vZHVsZSAnZWxpemFib3QnIHsgfTtcblwidXNlIHN0cmljdFwiO1xudmFyIGJ1aWxkZXIgPSByZXF1aXJlKCdib3RidWlsZGVyJyk7XG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xudmFyIEV4ZWMgPSByZXF1aXJlKCcuLi9leGVjL2V4ZWMnKTtcbnZhciBNYXRjaCA9IHJlcXVpcmUoJy4uL21hdGNoL21hdGNoJyk7XG52YXIgQW5hbHl6ZSA9IHJlcXVpcmUoJy4uL21hdGNoL2FuYWx5emUnKTtcbnZhciBlbGl6YWJvdCA9IHJlcXVpcmUoJ2VsaXphYm90Jyk7XG4vL2ltcG9ydCAqIGFzIGVsaXphYm90IGZyb20gJ2VsaXphYm90JztcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdzbWFydGRpYWxvZycpO1xudmFyIFBsYWluUmVjb2duaXplciA9IHJlcXVpcmUoJy4vcGxhaW5yZWNvZ25pemVyJyk7XG4vL3ZhciBidWlsZGVyID0gcmVxdWlyZSgnYm90YnVpbGRlcicpO1xudmFyIGRpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9tYXRjaC9kaXNwYXRjaGVyLmpzJykuZGlzcGF0Y2hlcjtcbmZ1bmN0aW9uIGdldENvbnZlcnNhdGlvbklkKHNlc3Npb24pIHtcbiAgICByZXR1cm4gc2Vzc2lvbi5tZXNzYWdlICYmXG4gICAgICAgIHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzICYmXG4gICAgICAgIHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzLmNvbnZlcnNhdGlvbi5pZDtcbn1cbnZhciBlbGl6YWJvdHMgPSB7fTtcbmZ1bmN0aW9uIGdldEVsaXphQm90KGlkKSB7XG4gICAgaWYgKCFlbGl6YWJvdHNbaWRdKSB7XG4gICAgICAgIGVsaXphYm90c1tpZF0gPSB7XG4gICAgICAgICAgICBhY2Nlc3M6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICBlbGl6YWJvdDogbmV3IGVsaXphYm90KClcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZWxpemFib3RzW2lkXS5hY2Nlc3MgPSBuZXcgRGF0ZSgpO1xuICAgIHJldHVybiBlbGl6YWJvdHNbaWRdLmVsaXphYm90O1xufVxudmFyIFRvb2xzID0gcmVxdWlyZSgnLi4vbWF0Y2gvdG9vbHMnKTtcbnZhciB0b29scyA9IFRvb2xzLmdldFRvb2xzKCk7XG52YXIgSW5wdXRGaWx0ZXJSdWxlcyA9IHJlcXVpcmUoJy4uL21hdGNoL2lucHV0RmlsdGVyUnVsZXMuanMnKTtcbnZhciBtUnVsZXMgPSBJbnB1dEZpbHRlclJ1bGVzLmdldE1SdWxlc1NhbXBsZSgpO1xudmFyIFNpbXBsZVJlY29nbml6ZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFNpbXBsZVJlY29nbml6ZXIoKSB7XG4gICAgfVxuICAgIFNpbXBsZVJlY29nbml6ZXIucHJvdG90eXBlLnJlY29nbml6ZSA9IGZ1bmN0aW9uIChjb250ZXh0LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgdSA9IHt9O1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlY29nbml6aW5nIFwiICsgY29udGV4dC5tZXNzYWdlLnRleHQpO1xuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInN0YXJ0XCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJTaG93RW50aXR5XCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJzdGFydCBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwidHJhaW5cIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcInRyYWluXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwibGVhcm5cIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcImxlYXJuXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS50eXBlID0gXCJ0cmFpbkZhY3RcIjtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInRyYWluIFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJoZWxwXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJoZWxwXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiZXhpdFwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwiZXhpdFwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwid3JvbmdcIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcIndyb25nXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJ3JlY29nbml6aW5nIG5vdGhpbmcnKTtcbiAgICAgICAgdS5pbnRlbnQgPSBcIk5vbmVcIjtcbiAgICAgICAgdS5zY29yZSA9IDAuMTtcbiAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgZTEuc2NvcmUgPSAwLjE7XG4gICAgICAgIHUuZW50aXRpZXMgPSBbXTtcbiAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICB9O1xuICAgIHJldHVybiBTaW1wbGVSZWNvZ25pemVyO1xufSgpKTtcbnZhciBTaW1wbGVVcERvd25SZWNvZ25pemVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTaW1wbGVVcERvd25SZWNvZ25pemVyKCkge1xuICAgIH1cbiAgICBTaW1wbGVVcERvd25SZWNvZ25pemVyLnByb3RvdHlwZS5yZWNvZ25pemUgPSBmdW5jdGlvbiAoY29udGV4dCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHUgPSB7fTtcbiAgICAgICAgY29uc29sZS5sb2coXCJyZWNvZ25pemluZyBcIiArIGNvbnRleHQubWVzc2FnZS50ZXh0KTtcbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJkb3duXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJpbnRlbnQuZG93blwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwic3RhcnQgXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInVwXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJpbnRlbnQudXBcIjtcbiAgICAgICAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInVwXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygncmVjb2duaXppbmcgbm90aGluZycpO1xuICAgICAgICB1LmludGVudCA9IFwiTm9uZVwiO1xuICAgICAgICB1LnNjb3JlID0gMC4xO1xuICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICBlMS5zY29yZSA9IDAuMTtcbiAgICAgICAgdS5lbnRpdGllcyA9IFtdO1xuICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgIH07XG4gICAgcmV0dXJuIFNpbXBsZVVwRG93blJlY29nbml6ZXI7XG59KCkpO1xudmFyIEFueU9iamVjdCA9IE9iamVjdDtcbi8vIGdsb2JhbFR1bm5lbC5pbml0aWFsaXplKHtcbi8vICBob3N0OiAncHJveHkuZXh4eGFtcGxlLmNvbScsXG4vLyAgcG9ydDogODA4MFxuLy8gfSlcbi8vIENyZWF0ZSBib3QgYW5kIGJpbmQgdG8gY29uc29sZVxuLy8gdmFyIGNvbm5lY3RvciA9IG5ldyBodG1sY29ubmVjdG9yLkhUTUxDb25uZWN0b3IoKVxuLy8gY29ubmVjdG9yLnNldEFuc3dlckhvb2soZnVuY3Rpb24gKHNBbnN3ZXIpIHtcbi8vICBjb25zb2xlLmxvZygnR290IGFuc3dlciA6ICcgKyBzQW5zd2VyICsgJ1xcbicpXG4vLyB9KVxudmFyIGJvdDtcbi8vIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuLy8gICBjb25uZWN0b3IucHJvY2Vzc01lc3NhZ2UoJ3N0YXJ0IHVuaXQgdGVzdCBBQkMgJylcbi8vIH0sIDUwMDApXG52YXIgZnMgPSByZXF1aXJlKCdmcycpO1xudmFyIG9KU09OID0gSlNPTi5wYXJzZSgnJyArIGZzLnJlYWRGaWxlU3luYygnLi9yZXNvdXJjZXMvbW9kZWwvaW50ZW50cy5qc29uJykpO1xudmFyIG9SdWxlcyA9IFBsYWluUmVjb2duaXplci5wYXJzZVJ1bGVzKG9KU09OKTtcbi8vIHZhciBSZWNvZ25pemVyID0gbmV3IChyZWNvZ25pemVyLlJlZ0V4cFJlY29nbml6ZXIpKG9SdWxlcyk7XG5mdW5jdGlvbiBsb2dRdWVyeShzZXNzaW9uLCBpbnRlbnQsIHJlc3VsdCkge1xuICAgIGZzLmFwcGVuZEZpbGUoJy4vbG9ncy9zaG93bWVxdWVyaWVzLnR4dCcsIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHRleHQ6IHNlc3Npb24ubWVzc2FnZS50ZXh0LFxuICAgICAgICB0aW1lc3RhbXA6IHNlc3Npb24ubWVzc2FnZS50aW1lc3RhbXAsXG4gICAgICAgIGludGVudDogaW50ZW50LFxuICAgICAgICByZXM6IHJlc3VsdCAmJiByZXN1bHQubGVuZ3RoICYmIE1hdGNoLlRvb2xNYXRjaC5kdW1wTmljZShyZXN1bHRbMF0pIHx8IFwiMFwiLFxuICAgICAgICBjb252ZXJzYXRpb25JZDogc2Vzc2lvbi5tZXNzYWdlLmFkZHJlc3NcbiAgICAgICAgICAgICYmIHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzLmNvbnZlcnNhdGlvblxuICAgICAgICAgICAgJiYgc2Vzc2lvbi5tZXNzYWdlLmFkZHJlc3MuY29udmVyc2F0aW9uLmlkIHx8IFwiXCIsXG4gICAgICAgIHVzZXJpZDogc2Vzc2lvbi5tZXNzYWdlLmFkZHJlc3NcbiAgICAgICAgICAgICYmIHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzLnVzZXJcbiAgICAgICAgICAgICYmIHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzLnVzZXIuaWQgfHwgXCJcIlxuICAgIH0pLCBmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgZGVidWdsb2coXCJsb2dnaW5nIGZhaWxlZCBcIiArIGVycik7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbi8qKlxuICogQ29uc3RydWN0IGEgYm90XG4gKiBAcGFyYW0gY29ubmVjdG9yIHtDb25uZWN0b3J9IHRoZSBjb25uZWN0b3IgdG8gdXNlXG4gKiBIVE1MQ29ubmVjdG9yXG4gKiBvciBjb25uZWN0b3IgPSBuZXcgYnVpbGRlci5Db25zb2xlQ29ubmVjdG9yKCkubGlzdGVuKClcbiAqL1xuZnVuY3Rpb24gbWFrZUJvdChjb25uZWN0b3IpIHtcbiAgICBib3QgPSBuZXcgYnVpbGRlci5Vbml2ZXJzYWxCb3QoY29ubmVjdG9yKTtcbiAgICAvLyBDcmVhdGUgTFVJUyByZWNvZ25pemVyIHRoYXQgcG9pbnRzIGF0IG91ciBtb2RlbCBhbmQgYWRkIGl0IGFzIHRoZSByb290ICcvJyBkaWFsb2cgZm9yIG91ciBDb3J0YW5hIEJvdC5cbiAgICAvLyB2YXIgbW9kZWwgPSBzZW5zaXRpdmUubW9kZWx1cmw7XG4gICAgLy8gdmFyIG1vZGVsID0gJ2h0dHBzOi8vYXBpLnByb2plY3RveGZvcmQuYWkvbHVpcy92Mi4wL2FwcHMvYzQxM2IyZWYtMzgyYy00NWJkLThmZjAtZjc2ZDYwZTJhODIxP3N1YnNjcmlwdGlvbi1rZXk9YzIxMzk4YjU5ODBhNGNlMDlmNDc0YmJmZWU5M2I4OTImcT0nXG4gICAgdmFyIHJlY29nbml6ZXIgPSBuZXcgUGxhaW5SZWNvZ25pemVyLlJlZ0V4cFJlY29nbml6ZXIob1J1bGVzKTtcbiAgICB2YXIgZGlhbG9nID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFtyZWNvZ25pemVyXSB9KTtcbiAgICAvLyBkaWFsb2cub25CZWdpbihmdW5jdGlvbihzZXNzaW9uLGFyZ3MpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcImJlZ2lubmluZyAuLi5cIilcbiAgICAvLyBzZXNzaW9uLmRpYWxvZ0RhdGEucmV0cnlQcm9tcHQgPSBhcmdzICYmIGFyZ3MucmV0cnlQcm9tcHQgfHwgXCJJIGFtIHNvcnJ5XCJcbiAgICAvLyBzZXNzaW9uLnNlbmQoXCJXaGF0IGRvIHlvdSB3YW50P1wiKVxuICAgIC8vXG4gICAgLy8gfSlcbiAgICB2YXIgZGlhbG9nVXBEb3duID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFtuZXcgU2ltcGxlVXBEb3duUmVjb2duaXplcigpXSB9KTtcbiAgICBib3QuZGlhbG9nKCcvdXBkb3duJywgZGlhbG9nVXBEb3duKTtcbiAgICBkaWFsb2dVcERvd24ub25CZWdpbihmdW5jdGlvbiAoc2Vzc2lvbikge1xuICAgICAgICBzZXNzaW9uLnNlbmQoXCJIaSB0aGVyZSwgdXBkb3duIGlzIHdhaXRpbmcgZm9yIHlvdVwiKTtcbiAgICB9KTtcbiAgICBkaWFsb2dVcERvd24ubWF0Y2hlcygnaW50ZW50LnVwJywgW1xuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IGFyZ3MgfHwge307XG4gICAgICAgICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCAneW91IHdhbnQgdG8gZ28gdXAnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSByZXN1bHRzLnJlcG9uc2U7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoeyByZXNwb25zZTogc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyB9KTtcbiAgICAgICAgfVxuICAgIF0pO1xuICAgIGRpYWxvZ1VwRG93bi5tYXRjaGVzKCdpbnRlbnQuZG93bicsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ3lvdSB3YW50IHRvIGdvIGRvd24hJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gLTE7IC8vIHJlc3VsdHMucmVwb25zZTtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHNlc3Npb24uc2VuZChcInN0aWxsIGdvaW5nIGRvd24/XCIpO1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgZGlhbG9nVXBEb3duLm9uRGVmYXVsdChmdW5jdGlvbiAoc2Vzc2lvbikge1xuICAgICAgICBsb2dRdWVyeShzZXNzaW9uLCBcIm9uRGVmYXVsdFwiKTtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKFwiWW91IGFyZSB0cmFwcGVkIGluIGEgZGlhbG9nIHdoaWNoIG9ubHkgdW5kZXJzdGFuZHMgdXAgYW5kIGRvd24sIG9uZSBvZiB0aGVtIHdpbGwgZ2V0IHlvdSBvdXRcIik7XG4gICAgICAgIC8vYnVpbGRlci5EaWFsb2dBY3Rpb24uc2VuZCgnSVxcJ20gc29ycnkgSSBkaWRuXFwndCB1bmRlcnN0YW5kLiBJIGNhbiBvbmx5IHNob3cgc3RhcnQgYW5kIHJpbmcnKTtcbiAgICB9KTtcbiAgICBib3QuZGlhbG9nKCcvdHJhaW4nLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxnb0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdEbyB5b3Ugd2FudCB0byB0cmFpbiBtZScpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IHJlc3VsdHMucmVwb25zZTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZW5kRGlhbG9nV2l0aFJlc3VsdCh7IHJlc3BvbnNlOiBzZXNzaW9uLkRpYWxvZ0RhdGEuYWJjIH0pO1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgYm90LmRpYWxvZygnLycsIGRpYWxvZyk7XG4gICAgZGlhbG9nLm1hdGNoZXMoJ1Nob3dNZScsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHZhciBpc0NvbWJpbmVkSW5kZXggPSB7fTtcbiAgICAgICAgICAgIHZhciBvTmV3RW50aXR5O1xuICAgICAgICAgICAgLy8gZXhwZWN0aW5nIGVudGl0eSBBMVxuICAgICAgICAgICAgZGVidWdsb2coXCJTaG93IEVudGl0eVwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyYXc6ICcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzKSwgdW5kZWZpbmVkLCAyKTtcbiAgICAgICAgICAgIHZhciBhMSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdBMScpO1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgIHZhciBjbGllbnQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnY2xpZW50Jyk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3lzdGVtT2JqZWN0SWQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnc3lzdGVtT2JqZWN0SWQnKSB8fFxuICAgICAgICAgICAgICAgICAgICBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnU3lzdGVtT2JqZWN0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ2J1aWx0aW4ubnVtYmVyJyk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3lzdGVtT2JqZWN0Q2F0ZWdvcnkgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnU3lzdGVtT2JqZWN0Q2F0ZWdvcnknKTtcbiAgICAgIFxuICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnN5c3RlbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtSWQ6IHN5c3RlbUlkLFxuICAgICAgICAgICAgICAgICAgICBjbGllbnQ6IGNsaWVudFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgdmFyIHNTeXN0ZW1JZCA9IHN5c3RlbUlkICYmIHN5c3RlbUlkLmVudGl0eTtcbiAgICAgICAgICAgICAgICAgIHZhciBzQ2xpZW50ID0gY2xpZW50ICYmIGNsaWVudC5lbnRpdHk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3N5c3RlbU9iamVjdElkID0gc3lzdGVtT2JqZWN0SWQgJiYgc3lzdGVtT2JqZWN0SWQuZW50aXR5O1xuICAgICAgICAgICAgICAgICAgdmFyIHNTeXN0ZW1PYmplY3RDYXRlZ29yeSA9IHN5c3RlbU9iamVjdENhdGVnb3J5ICYmIHN5c3RlbU9iamVjdENhdGVnb3J5LmVudGl0eTtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gQW5hbHl6ZS5hbmFseXplQWxsKGExLmVudGl0eSwgbVJ1bGVzLCB0b29scyk7XG4gICAgICAgICAgICBsb2dRdWVyeShzZXNzaW9uLCAnU2hvd01lJywgcmVzdWx0KTtcbiAgICAgICAgICAgIC8vIHRlc3QuZXhwZWN0KDMpXG4gICAgICAgICAgICAvLyAgdGVzdC5kZWVwRXF1YWwocmVzdWx0LndlaWdodCwgMTIwLCAnY29ycmVjdCB3ZWlnaHQnKTtcbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8IHJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBkZWJ1Z2xvZygncmVzdWx0IDogJyArIEpTT04uc3RyaW5naWZ5KHJlc3VsdCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnYmVzdCByZXN1bHQgOiAnICsgSlNPTi5zdHJpbmdpZnkocmVzdWx0WzBdIHx8IHt9LCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgIGRlYnVnbG9nKCd0b3AgOiAnICsgTWF0Y2guVG9vbE1hdGNoLmR1bXBXZWlnaHRzVG9wKHJlc3VsdCwgeyB0b3A6IDMgfSkpO1xuICAgICAgICAgICAgaWYgKEFuYWx5emUuaXNDb21wbGV0ZShyZXN1bHRbMF0pKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCA9IHJlc3VsdFswXTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ1Nob3dpbmcgZW50aXR5IC4uLicpO1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKEFuYWx5emUuZ2V0UHJvbXB0KHJlc3VsdFswXSkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvbXB0ID0gQW5hbHl6ZS5nZXRQcm9tcHQocmVzdWx0WzBdKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0ID0gcmVzdWx0WzBdO1xuICAgICAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5wcm9tcHQgPSBwcm9tcHQ7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKFwiTm90IGVub3VnaCBpbmZvcm1hdGlvbiBzdXBwbGllZDogXCIgKyBNYXRjaC5Ub29sTWF0Y2guZHVtcE5pY2Uoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCkpO1xuICAgICAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sIHByb21wdC50ZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBiZXN0ID0gcmVzdWx0Lmxlbmd0aCA/IE1hdGNoLlRvb2xNYXRjaC5kdW1wTmljZShyZXN1bHRbMF0pIDogXCI8bm90aGluZz5cIjtcbiAgICAgICAgICAgICAgICAvL3Nlc3Npb24uc2VuZCgnSSBkaWQgbm90IHVuZGVyc3RhbmQgdGhpcycgKyBiZXN0KTtcbiAgICAgICAgICAgICAgICB2YXIgcmVwbHkgPSBuZXcgYnVpbGRlci5NZXNzYWdlKHNlc3Npb24pXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KCdJIGRpZCBub3QgdW5kZXJzdGFuZCB0aGlzJyArIGJlc3QpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRFbnRpdHkoeyB1cmw6IFwiSSBkb24ndCBrbm93XCIgfSk7XG4gICAgICAgICAgICAgICAgLy8gLmFkZEF0dGFjaG1lbnQoeyBmYWxsYmFja1RleHQ6IFwiSSBkb24ndCBrbm93XCIsIGNvbnRlbnRUeXBlOiAnaW1hZ2UvanBlZycsIGNvbnRlbnRVcmw6IFwid3d3LndvbWJhdC5vcmdcIiB9KTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQocmVwbHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTaG93IGVudGl0aWVzOiAnICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICBcbiAgICAgICAgICAgICAgICAgIC8vIGRvIHRoZSBiaWcgYW5hbHlpcyAuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1ID0gZGlzcGF0Y2hlci5leGVjU2hvd0VudGl0eSh7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbUlkOiBzU3lzdGVtSWQsXG4gICAgICAgICAgICAgICAgICAgIGNsaWVudDogc0NsaWVudCxcbiAgICAgICAgICAgICAgICAgICAgdG9vbDogc1Rvb2wsXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiBzU3lzdGVtT2JqZWN0Q2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBzc3lzdGVtT2JqZWN0SWRcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgLy8gIHNlc3Npb24uc2VuZCgnU2hvd2luZyBlbnRpdHkgLi4uJyk7XG4gICAgICAgICAgICAvLyAgY29uc29sZS5sb2coXCJzaG93IGVudGl0eSwgU2hvdyBzZXNzaW9uIDogXCIgKyBKU09OLnN0cmluZ2lmeShzZXNzaW9uKSlcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiU2hvdyBlbnRpdHkgOiBcIiArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpKVxuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQ7XG4gICAgICAgICAgICBpZiAoIXJlc3VsdCB8fCByZXN1bHQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBzb21lIHByb21wdGluZ1xuICAgICAgICAgICAgICAgIEFuYWx5emUuc2V0UHJvbXB0KHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQsIHNlc3Npb24uZGlhbG9nRGF0YS5wcm9tcHQsIHJlc3VsdHMucmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKEFuYWx5emUuaXNDb21wbGV0ZShzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0KSkge1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKEFuYWx5emUuZ2V0UHJvbXB0KHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb21wdCA9IEFuYWx5emUuZ2V0UHJvbXB0KHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpO1xuICAgICAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5wcm9tcHQgPSBwcm9tcHQ7XG4gICAgICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgcHJvbXB0LnRleHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQ7XG4gICAgICAgICAgICBpZiAocmVzdWx0cy5yZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIC8vIHNvbWUgcHJvbXB0aW5nXG4gICAgICAgICAgICAgICAgQW5hbHl6ZS5zZXRQcm9tcHQoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCwgc2Vzc2lvbi5kaWFsb2dEYXRhLnByb21wdCwgcmVzdWx0cy5yZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoQW5hbHl6ZS5pc0NvbXBsZXRlKHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvL3Nlc3Npb24uc2VuZChcInN0YXJ0aW5nICA+IFwiICtcbiAgICAgICAgICAgICAgICB2YXIgZXhlYyA9IEV4ZWMuZXhlY1Rvb2woc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgdmFyIHJlcGx5ID0gbmV3IGJ1aWxkZXIuTWVzc2FnZShzZXNzaW9uKVxuICAgICAgICAgICAgICAgICAgICAudGV4dChleGVjLnRleHQpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRFbnRpdHkoZXhlYy5hY3Rpb24pO1xuICAgICAgICAgICAgICAgIC8vIC5hZGRBdHRhY2htZW50KHsgZmFsbGJhY2tUZXh0OiBcIkkgZG9uJ3Qga25vd1wiLCBjb250ZW50VHlwZTogJ2ltYWdlL2pwZWcnLCBjb250ZW50VXJsOiBcInd3dy53b21iYXQub3JnXCIgfSk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKHJlcGx5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb24uc2VuZChcIk5vdCBlbm91Z2ggaW5mb3JtYXRpb24gc3VwcGxpZWQ6IFwiICsgTWF0Y2guVG9vbE1hdGNoLmR1bXBOaWNlKHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb24uc2VuZChcIkkgZGlkIG5vdCBnZXQgd2hhdCB5b3Ugd2FudFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgXSk7XG4gICAgZGlhbG9nLm1hdGNoZXMoJ1dyb25nJywgW1xuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5iZWdpbkRpYWxvZygnL3VwZG93bicsIHNlc3Npb24udXNlckRhdGEuY291bnQpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKFwiYmFjayBmcm9tIHdyb25nIDogXCIgKyBKU09OLnN0cmluZ2lmeShyZXN1bHRzKSk7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2VuZCBvZiB3cm9uZycpO1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgZGlhbG9nLm1hdGNoZXMoJ0V4aXQnLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZXhpdCA6Jyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZXhpdCcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzKSk7XG4gICAgICAgICAgICBzZXNzaW9uLnNlbmQoXCJ5b3UgYXJlIGluIGEgbG9naWMgbG9vcCBcIik7XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBkaWFsb2cubWF0Y2hlcygnSGVscCcsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdoZWxwIDonKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdoZWxwJyk7XG4gICAgICAgICAgICBzZXNzaW9uLnNlbmQoXCJJIGtub3cgYWJvdXQgLi4uLiA8Y2F0ZWdvcmllcz4+XCIpO1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgLy8gQWRkIGludGVudCBoYW5kbGVyc1xuICAgIGRpYWxvZy5tYXRjaGVzKCd0cmFpbicsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cmFpbicpO1xuICAgICAgICAgICAgLy8gUmVzb2x2ZSBhbmQgc3RvcmUgYW55IGVudGl0aWVzIHBhc3NlZCBmcm9tIExVSVMuXG4gICAgICAgICAgICB2YXIgdGl0bGUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnYnVpbHRpbi5hbGFybS50aXRsZScpO1xuICAgICAgICAgICAgdmFyIHRpbWUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIucmVzb2x2ZVRpbWUoYXJncy5lbnRpdGllcyk7XG4gICAgICAgICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm0gPSB7XG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlID8gdGl0bGUuZW50aXR5IDogbnVsbCxcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IHRpbWUgPyB0aW1lLmdldFRpbWUoKSA6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBQcm9tcHQgZm9yIHRpdGxlXG4gICAgICAgICAgICBpZiAoIWFsYXJtLnRpdGxlKSB7XG4gICAgICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ1doYXQgZmFjdCB3b3VsZCB5b3UgbGlrZSB0byB0cmFpbj8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgICAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLnJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYWxhcm0udGl0bGUgPSByZXN1bHRzLnJlc3BvbnNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUHJvbXB0IGZvciB0aW1lICh0aXRsZSB3aWxsIGJlIGJsYW5rIGlmIHRoZSB1c2VyIHNhaWQgY2FuY2VsKVxuICAgICAgICAgICAgaWYgKGFsYXJtLnRpdGxlICYmICFhbGFybS50aW1lc3RhbXApIHtcbiAgICAgICAgICAgICAgICBidWlsZGVyLlByb21wdHMudGltZShzZXNzaW9uLCAnV2hhdCB0aW1lIHdvdWxkIHlvdSBsaWtlIHRvIHNldCB0aGUgYWxhcm0gZm9yPycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGltZSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5yZXNvbHZlVGltZShbcmVzdWx0cy5yZXNwb25zZV0pO1xuICAgICAgICAgICAgICAgIGFsYXJtLnRpbWVzdGFtcCA9IHRpbWUgPyB0aW1lLmdldFRpbWUoKSA6IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBTZXQgdGhlIGFsYXJtIChpZiB0aXRsZSBvciB0aW1lc3RhbXAgaXMgYmxhbmsgdGhlIHVzZXIgc2FpZCBjYW5jZWwpXG4gICAgICAgICAgICBpZiAoYWxhcm0udGl0bGUgJiYgYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgICAgICAgICAgLy8gU2F2ZSBhZGRyZXNzIG9mIHdobyB0byBub3RpZnkgYW5kIHdyaXRlIHRvIHNjaGVkdWxlci5cbiAgICAgICAgICAgICAgICBhbGFybS5hZGRyZXNzID0gc2Vzc2lvbi5tZXNzYWdlLmFkZHJlc3M7XG4gICAgICAgICAgICAgICAgLy9hbGFybXNbYWxhcm0udGl0bGVdID0gYWxhcm07XG4gICAgICAgICAgICAgICAgLy8gU2VuZCBjb25maXJtYXRpb24gdG8gdXNlclxuICAgICAgICAgICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoYWxhcm0udGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICB2YXIgaXNBTSA9IGRhdGUuZ2V0SG91cnMoKSA8IDEyO1xuICAgICAgICAgICAgICAgIHNlc3Npb24uc2VuZCgnQ3JlYXRpbmcgYWxhcm0gbmFtZWQgXCIlc1wiIGZvciAlZC8lZC8lZCAlZDolMDJkJXMnLCBhbGFybS50aXRsZSwgZGF0ZS5nZXRNb250aCgpICsgMSwgZGF0ZS5nZXREYXRlKCksIGRhdGUuZ2V0RnVsbFllYXIoKSwgaXNBTSA/IGRhdGUuZ2V0SG91cnMoKSA6IGRhdGUuZ2V0SG91cnMoKSAtIDEyLCBkYXRlLmdldE1pbnV0ZXMoKSwgaXNBTSA/ICdhbScgOiAncG0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlc3Npb24uc2VuZCgnT2suLi4gbm8gcHJvYmxlbS4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIF0pO1xuICAgIGRpYWxvZy5vbkRlZmF1bHQoZnVuY3Rpb24gKHNlc3Npb24pIHtcbiAgICAgICAgbG9nUXVlcnkoc2Vzc2lvbiwgXCJvbkRlZmF1bHRcIik7XG4gICAgICAgIHZhciBlbGl6YSA9IGdldEVsaXphQm90KGdldENvbnZlcnNhdGlvbklkKHNlc3Npb24pKTtcbiAgICAgICAgdmFyIHJlcGx5ID0gZWxpemEudHJhbnNmb3JtKHNlc3Npb24ubWVzc2FnZS50ZXh0KTtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKHJlcGx5KTtcbiAgICAgICAgLy9uZXcgRWlsemFib3RcbiAgICAgICAgLy9zZXNzaW9uLnNlbmQoXCJJIGRvIG5vdCB1bmRlcnN0YW5kIHRoaXMgYXQgYWxsXCIpO1xuICAgICAgICAvL2J1aWxkZXIuRGlhbG9nQWN0aW9uLnNlbmQoJ0lcXCdtIHNvcnJ5IEkgZGlkblxcJ3QgdW5kZXJzdGFuZC4gSSBjYW4gb25seSBzaG93IHN0YXJ0IGFuZCByaW5nJyk7XG4gICAgfSk7XG4gICAgLypcbiAgICAvLyBWZXJ5IHNpbXBsZSBhbGFybSBzY2hlZHVsZXJcbiAgICB2YXIgYWxhcm1zID0ge307XG4gICAgc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgZm9yICh2YXIga2V5IGluIGFsYXJtcykge1xuICAgICAgICB2YXIgYWxhcm0gPSBhbGFybXNba2V5XTtcbiAgICAgICAgaWYgKG5vdyA+PSBhbGFybS50aW1lc3RhbXApIHtcbiAgICAgICAgICB2YXIgbXNnID0gbmV3IGJ1aWxkZXIuTWVzc2FnZSgpXG4gICAgICAgICAgICAuYWRkcmVzcyhhbGFybS5hZGRyZXNzKVxuICAgICAgICAgICAgLnRleHQoJ0hlcmVcXCdzIHlvdXIgXFwnJXNcXCcgYWxhcm0uJywgYWxhcm0udGl0bGUpO1xuICAgICAgICAgIGJvdC5zZW5kKG1zZyk7XG4gICAgICAgICAgZGVsZXRlIGFsYXJtc1trZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSwgMTUwMDApO1xuICAgICovXG59XG5pZiAobW9kdWxlKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgIG1ha2VCb3Q6IG1ha2VCb3RcbiAgICB9O1xufVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
