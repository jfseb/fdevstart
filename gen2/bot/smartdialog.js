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
var newFlow = true;
var Model = require('../model/model');
var ExecServer = require('../exec/execserver');
var theModel = Model.loadModels();
if (newFlow) {} else {}
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
        //if (newFlow) {
        var result = Analyze.analyzeAll(a1.entity, theModel.mRules, theModel.tools);
        // } else {
        //  const result = Analyze.analyzeAll(a1.entity,
        //     mRules, tools);
        // }
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
            //   if (newFlow) {
            var exec = ExecServer.execTool(session.dialogData.result, theModel.records);
            //         )
            //} else {
            //  var exec = Exec.execTool(session.dialogData.result as IMatch.IToolMatch);
            //}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9ib3Qvc21hcnRkaWFsb2cudHMiLCJib3Qvc21hcnRkaWFsb2cuanMiXSwibmFtZXMiOlsiYnVpbGRlciIsInJlcXVpcmUiLCJkZWJ1ZyIsIk1hdGNoIiwiQW5hbHl6ZSIsImVsaXphYm90IiwiZGVidWdsb2ciLCJQbGFpblJlY29nbml6ZXIiLCJkaXNwYXRjaGVyIiwiZ2V0Q29udmVyc2F0aW9uSWQiLCJzZXNzaW9uIiwibWVzc2FnZSIsImFkZHJlc3MiLCJjb252ZXJzYXRpb24iLCJpZCIsImVsaXphYm90cyIsImdldEVsaXphQm90IiwiYWNjZXNzIiwiRGF0ZSIsIm5ld0Zsb3ciLCJNb2RlbCIsIkV4ZWNTZXJ2ZXIiLCJ0aGVNb2RlbCIsImxvYWRNb2RlbHMiLCJTaW1wbGVSZWNvZ25pemVyIiwicHJvdG90eXBlIiwicmVjb2duaXplIiwiY29udGV4dCIsImNhbGxiYWNrIiwidSIsImNvbnNvbGUiLCJsb2ciLCJ0ZXh0IiwiaW5kZXhPZiIsImludGVudCIsInNjb3JlIiwiZTEiLCJzdGFydEluZGV4IiwibGVuZ3RoIiwiZW5kSW5kZXgiLCJlbnRpdGllcyIsInVuZGVmaW5lZCIsInR5cGUiLCJTaW1wbGVVcERvd25SZWNvZ25pemVyIiwiQW55T2JqZWN0IiwiT2JqZWN0IiwiYm90IiwiZnMiLCJvSlNPTiIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlU3luYyIsIm9SdWxlcyIsInBhcnNlUnVsZXMiLCJsb2dRdWVyeSIsInJlc3VsdCIsImFwcGVuZEZpbGUiLCJzdHJpbmdpZnkiLCJ0aW1lc3RhbXAiLCJyZXMiLCJUb29sTWF0Y2giLCJkdW1wTmljZSIsImNvbnZlcnNhdGlvbklkIiwidXNlcmlkIiwidXNlciIsImVyciIsIm1ha2VCb3QiLCJjb25uZWN0b3IiLCJVbml2ZXJzYWxCb3QiLCJyZWNvZ25pemVyIiwiUmVnRXhwUmVjb2duaXplciIsImRpYWxvZyIsIkludGVudERpYWxvZyIsInJlY29nbml6ZXJzIiwiZGlhbG9nVXBEb3duIiwib25CZWdpbiIsInNlbmQiLCJtYXRjaGVzIiwiYXJncyIsIm5leHQiLCJkaWFsb2dEYXRhIiwiYWJjIiwiUHJvbXB0cyIsInJlc3VsdHMiLCJyZXBvbnNlIiwiZW5kRGlhbG9nV2l0aFJlc3VsdCIsInJlc3BvbnNlIiwib25EZWZhdWx0IiwiZGlhbGdvRGF0YSIsIkRpYWxvZ0RhdGEiLCJpc0NvbWJpbmVkSW5kZXgiLCJvTmV3RW50aXR5IiwiYTEiLCJFbnRpdHlSZWNvZ25pemVyIiwiZmluZEVudGl0eSIsImFuYWx5emVBbGwiLCJlbnRpdHkiLCJtUnVsZXMiLCJ0b29scyIsImR1bXBXZWlnaHRzVG9wIiwidG9wIiwiaXNDb21wbGV0ZSIsImdldFByb21wdCIsInByb21wdCIsImJlc3QiLCJyZXBseSIsIk1lc3NhZ2UiLCJhZGRFbnRpdHkiLCJ1cmwiLCJzZXRQcm9tcHQiLCJleGVjIiwiZXhlY1Rvb2wiLCJyZWNvcmRzIiwiYWN0aW9uIiwiYmVnaW5EaWFsb2ciLCJ1c2VyRGF0YSIsImNvdW50IiwiYWxhcm0iLCJ0aXRsZSIsInRpbWUiLCJyZXNvbHZlVGltZSIsImdldFRpbWUiLCJkYXRlIiwiaXNBTSIsImdldEhvdXJzIiwiZ2V0TW9udGgiLCJnZXREYXRlIiwiZ2V0RnVsbFllYXIiLCJnZXRNaW51dGVzIiwiZWxpemEiLCJ0cmFuc2Zvcm0iLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7OztBQU9BOzs7OztBQUtBO0FDQ0E7O0FEQ0EsSUFBWUEsVUFBT0MsUUFBTSxZQUFOLENBQW5CO0FBRUEsSUFBWUMsUUFBS0QsUUFBTSxPQUFOLENBQWpCO0FBR0EsSUFBWUUsUUFBS0YsUUFBTSxnQkFBTixDQUFqQjtBQUVBLElBQVlHLFVBQU9ILFFBQU0sa0JBQU4sQ0FBbkI7QUFFQSxJQUFJSSxXQUFXSixRQUFRLFVBQVIsQ0FBZjtBQUNBO0FBRUEsSUFBSUssV0FBV0osTUFBTSxhQUFOLENBQWY7QUFDQSxJQUFZSyxrQkFBZU4sUUFBTSxtQkFBTixDQUEzQjtBQUNBO0FBRUEs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LGdCQUFRa0UsSUFBUixDQUFhNkIsS0FBYjtBQUNBO0FBQ0E7QUFDQTtBQUNELEtBUkQ7QUFVRTs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFpQkQ7QUFFRCxJQUFJMEIsTUFBSixFQUFZO0FBQ1ZBLFdBQU9DLE9BQVAsR0FBaUI7QUFDZmxFLGlCQUFTQTtBQURNLEtBQWpCO0FBR0QiLCJmaWxlIjoiYm90L3NtYXJ0ZGlhbG9nLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGUgYm90IGltcGxlbWVudGF0aW9uXG4gKlxuICogSW5zdGFudGlhdGUgYXBzc2luZyBhIGNvbm5lY3RvciB2aWFcbiAqIG1ha2VCb3RcbiAqXG4gKi9cbi8qKlxuICogQGZpbGVcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LnNtYXJ0ZGlhbG9nXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cbi8vZGVjbGFyZSBtb2R1bGUgJ2VsaXphYm90JyB7IH07XG5cbmltcG9ydCAqIGFzIGJ1aWxkZXIgZnJvbSAnYm90YnVpbGRlcic7XG5cbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcblxuaW1wb3J0ICogYXMgRXhlYyBmcm9tICcuLi9leGVjL2V4ZWMnO1xuaW1wb3J0ICogYXMgTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvbWF0Y2gnO1xuXG5pbXBvcnQgKiBhcyBBbmFseXplIGZyb20gJy4uL21hdGNoL2FuYWx5emUnO1xuXG52YXIgZWxpemFib3QgPSByZXF1aXJlKCdlbGl6YWJvdCcpO1xuLy9pbXBvcnQgKiBhcyBlbGl6YWJvdCBmcm9tICdlbGl6YWJvdCc7XG5cbmxldCBkZWJ1Z2xvZyA9IGRlYnVnKCdzbWFydGRpYWxvZycpO1xuaW1wb3J0ICogYXMgUGxhaW5SZWNvZ25pemVyIGZyb20gJy4vcGxhaW5yZWNvZ25pemVyJztcbi8vdmFyIGJ1aWxkZXIgPSByZXF1aXJlKCdib3RidWlsZGVyJyk7XG5cbnZhciBkaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vbWF0Y2gvZGlzcGF0Y2hlci5qcycpLmRpc3BhdGNoZXI7XG5cblxuZnVuY3Rpb24gZ2V0Q29udmVyc2F0aW9uSWQoc2Vzc2lvbjogYnVpbGRlci5TZXNzaW9uKTogc3RyaW5nIHtcbiAgcmV0dXJuIHNlc3Npb24ubWVzc2FnZSAmJlxuICAgIHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzICYmXG4gICAgc2Vzc2lvbi5tZXNzYWdlLmFkZHJlc3MuY29udmVyc2F0aW9uLmlkO1xufVxuXG52YXIgZWxpemFib3RzID0ge307XG5cbmZ1bmN0aW9uIGdldEVsaXphQm90KGlkOiBzdHJpbmcpIHtcbiAgaWYgKCFlbGl6YWJvdHNbaWRdKSB7XG4gICAgZWxpemFib3RzW2lkXSA9IHtcbiAgICAgIGFjY2VzczogbmV3IERhdGUoKSxcbiAgICAgIGVsaXphYm90OiBuZXcgZWxpemFib3QoKVxuICAgIH07XG4gIH1cbiAgZWxpemFib3RzW2lkXS5hY2Nlc3MgPSBuZXcgRGF0ZSgpO1xuICByZXR1cm4gZWxpemFib3RzW2lkXS5lbGl6YWJvdDtcbn1cblxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xuaW1wb3J0ICogYXMgVG9vbHMgZnJvbSAnLi4vbWF0Y2gvdG9vbHMnO1xuXG52YXIgbmV3RmxvdyA9IHRydWU7XG5cbmltcG9ydCAqIGFzIE1vZGVsIGZyb20gJy4uL21vZGVsL21vZGVsJztcbmltcG9ydCAqIGFzIEV4ZWNTZXJ2ZXIgZnJvbSAnLi4vZXhlYy9leGVjc2VydmVyJztcblxuY29uc3QgdGhlTW9kZWwgPSBNb2RlbC5sb2FkTW9kZWxzKCk7XG5pZiAobmV3Rmxvdykge1xuXG59IGVsc2Uge1xuXG4gIC8vY29uc3QgdG9vbHMgPSBUb29scy5nZXRUb29scygpO1xuICAvL2NvbnN0IElucHV0RmlsdGVyUnVsZXMgPSByZXF1aXJlKCcuLi9tYXRjaC9pbnB1dEZpbHRlclJ1bGVzLmpzJyk7XG4gIC8vY29uc3QgbVJ1bGVzID0gSW5wdXRGaWx0ZXJSdWxlcy5nZXRNUnVsZXNTYW1wbGUoKTtcbn1cblxuXG5cbmNsYXNzIFNpbXBsZVJlY29nbml6ZXIgaW1wbGVtZW50cyBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG5cbiAgfVxuXG4gIHJlY29nbml6ZShjb250ZXh0OiBidWlsZGVyLklSZWNvZ25pemVDb250ZXh0LCBjYWxsYmFjazogKGVycjogRXJyb3IsIHJlc3VsdDogYnVpbGRlci5JSW50ZW50UmVjb2duaXplclJlc3VsdCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHZhciB1ID0ge30gYXMgYnVpbGRlci5JSW50ZW50UmVjb2duaXplclJlc3VsdDtcblxuICAgIGNvbnNvbGUubG9nKFwicmVjb2duaXppbmcgXCIgKyBjb250ZXh0Lm1lc3NhZ2UudGV4dCk7XG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJzdGFydFwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwiU2hvd0VudGl0eVwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInN0YXJ0IFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJ0cmFpblwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwidHJhaW5cIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImxlYXJuXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJsZWFyblwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnR5cGUgPSBcInRyYWluRmFjdFwiO1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwidHJhaW4gXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJoZWxwXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJoZWxwXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwidHJhaW4gXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJleGl0XCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJleGl0XCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcIndyb25nXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJ3cm9uZ1wiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ3JlY29nbml6aW5nIG5vdGhpbmcnKTtcbiAgICB1LmludGVudCA9IFwiTm9uZVwiO1xuICAgIHUuc2NvcmUgPSAwLjE7XG4gICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgIGUxLnNjb3JlID0gMC4xO1xuICAgIHUuZW50aXRpZXMgPSBbXTtcbiAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICB9XG59XG5cblxuY2xhc3MgU2ltcGxlVXBEb3duUmVjb2duaXplciBpbXBsZW1lbnRzIGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcblxuICB9XG5cbiAgcmVjb2duaXplKGNvbnRleHQ6IGJ1aWxkZXIuSVJlY29nbml6ZUNvbnRleHQsIGNhbGxiYWNrOiAoZXJyOiBFcnJvciwgcmVzdWx0OiBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdmFyIHUgPSB7fSBhcyBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0O1xuXG4gICAgY29uc29sZS5sb2coXCJyZWNvZ25pemluZyBcIiArIGNvbnRleHQubWVzc2FnZS50ZXh0KTtcbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImRvd25cIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcImludGVudC5kb3duXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwic3RhcnQgXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJ1cFwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwiaW50ZW50LnVwXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwidXBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygncmVjb2duaXppbmcgbm90aGluZycpO1xuICAgIHUuaW50ZW50ID0gXCJOb25lXCI7XG4gICAgdS5zY29yZSA9IDAuMTtcbiAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgZTEuc2NvcmUgPSAwLjE7XG4gICAgdS5lbnRpdGllcyA9IFtdO1xuICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gIH1cbn1cblxuY29uc3QgQW55T2JqZWN0ID0gT2JqZWN0IGFzIGFueTtcbi8vIGdsb2JhbFR1bm5lbC5pbml0aWFsaXplKHtcbi8vICBob3N0OiAncHJveHkuZXh4eGFtcGxlLmNvbScsXG4vLyAgcG9ydDogODA4MFxuLy8gfSlcblxuLy8gQ3JlYXRlIGJvdCBhbmQgYmluZCB0byBjb25zb2xlXG4vLyB2YXIgY29ubmVjdG9yID0gbmV3IGh0bWxjb25uZWN0b3IuSFRNTENvbm5lY3RvcigpXG5cbi8vIGNvbm5lY3Rvci5zZXRBbnN3ZXJIb29rKGZ1bmN0aW9uIChzQW5zd2VyKSB7XG4vLyAgY29uc29sZS5sb2coJ0dvdCBhbnN3ZXIgOiAnICsgc0Fuc3dlciArICdcXG4nKVxuLy8gfSlcblxudmFyIGJvdDtcbi8vIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuLy8gICBjb25uZWN0b3IucHJvY2Vzc01lc3NhZ2UoJ3N0YXJ0IHVuaXQgdGVzdCBBQkMgJylcbi8vIH0sIDUwMDApXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcblxudmFyIG9KU09OID0gSlNPTi5wYXJzZSgnJyArIGZzLnJlYWRGaWxlU3luYygnLi9yZXNvdXJjZXMvbW9kZWwvaW50ZW50cy5qc29uJykpO1xudmFyIG9SdWxlcyA9IFBsYWluUmVjb2duaXplci5wYXJzZVJ1bGVzKG9KU09OKTtcbi8vIHZhciBSZWNvZ25pemVyID0gbmV3IChyZWNvZ25pemVyLlJlZ0V4cFJlY29nbml6ZXIpKG9SdWxlcyk7XG5cblxuZnVuY3Rpb24gbG9nUXVlcnkoc2Vzc2lvbjogYnVpbGRlci5TZXNzaW9uLCBpbnRlbnQ6IHN0cmluZywgcmVzdWx0PzogQXJyYXk8SU1hdGNoLklUb29sTWF0Y2g+KSB7XG5cbiAgZnMuYXBwZW5kRmlsZSgnLi9sb2dzL3Nob3dtZXF1ZXJpZXMudHh0JywgXCJcXG5cIiArIEpTT04uc3RyaW5naWZ5KHtcbiAgICB0ZXh0OiBzZXNzaW9uLm1lc3NhZ2UudGV4dCxcbiAgICB0aW1lc3RhbXA6IHNlc3Npb24ubWVzc2FnZS50aW1lc3RhbXAsXG4gICAgaW50ZW50OiBpbnRlbnQsXG4gICAgcmVzOiByZXN1bHQgJiYgcmVzdWx0Lmxlbmd0aCAmJiBNYXRjaC5Ub29sTWF0Y2guZHVtcE5pY2UocmVzdWx0WzBdKSB8fCBcIjBcIixcbiAgICBjb252ZXJzYXRpb25JZDogc2Vzc2lvbi5tZXNzYWdlLmFkZHJlc3NcbiAgICAmJiBzZXNzaW9uLm1lc3NhZ2UuYWRkcmVzcy5jb252ZXJzYXRpb25cbiAgICAmJiBzZXNzaW9uLm1lc3NhZ2UuYWRkcmVzcy5jb252ZXJzYXRpb24uaWQgfHwgXCJcIixcbiAgICB1c2VyaWQ6IHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzXG4gICAgJiYgc2Vzc2lvbi5tZXNzYWdlLmFkZHJlc3MudXNlclxuICAgICYmIHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzLnVzZXIuaWQgfHwgXCJcIlxuICB9KSwgZnVuY3Rpb24gKGVyciwgcmVzKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgZGVidWdsb2coXCJsb2dnaW5nIGZhaWxlZCBcIiArIGVycik7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBDb25zdHJ1Y3QgYSBib3RcbiAqIEBwYXJhbSBjb25uZWN0b3Ige0Nvbm5lY3Rvcn0gdGhlIGNvbm5lY3RvciB0byB1c2VcbiAqIEhUTUxDb25uZWN0b3JcbiAqIG9yIGNvbm5lY3RvciA9IG5ldyBidWlsZGVyLkNvbnNvbGVDb25uZWN0b3IoKS5saXN0ZW4oKVxuICovXG5mdW5jdGlvbiBtYWtlQm90KGNvbm5lY3Rvcikge1xuICBib3QgPSBuZXcgYnVpbGRlci5Vbml2ZXJzYWxCb3QoY29ubmVjdG9yKTtcblxuXG5cbiAgLy8gQ3JlYXRlIExVSVMgcmVjb2duaXplciB0aGF0IHBvaW50cyBhdCBvdXIgbW9kZWwgYW5kIGFkZCBpdCBhcyB0aGUgcm9vdCAnLycgZGlhbG9nIGZvciBvdXIgQ29ydGFuYSBCb3QuXG4gIC8vIHZhciBtb2RlbCA9IHNlbnNpdGl2ZS5tb2RlbHVybDtcbiAgLy8gdmFyIG1vZGVsID0gJ2h0dHBzOi8vYXBpLnByb2plY3RveGZvcmQuYWkvbHVpcy92Mi4wL2FwcHMvYzQxM2IyZWYtMzgyYy00NWJkLThmZjAtZjc2ZDYwZTJhODIxP3N1YnNjcmlwdGlvbi1rZXk9YzIxMzk4YjU5ODBhNGNlMDlmNDc0YmJmZWU5M2I4OTImcT0nXG4gIHZhciByZWNvZ25pemVyID0gbmV3IFBsYWluUmVjb2duaXplci5SZWdFeHBSZWNvZ25pemVyKG9SdWxlcyk7XG5cbiAgdmFyIGRpYWxvZyA9IG5ldyBidWlsZGVyLkludGVudERpYWxvZyh7IHJlY29nbml6ZXJzOiBbcmVjb2duaXplcl0gfSk7XG4gIC8vIGRpYWxvZy5vbkJlZ2luKGZ1bmN0aW9uKHNlc3Npb24sYXJncykge1xuICAvLyBjb25zb2xlLmxvZyhcImJlZ2lubmluZyAuLi5cIilcbiAgLy8gc2Vzc2lvbi5kaWFsb2dEYXRhLnJldHJ5UHJvbXB0ID0gYXJncyAmJiBhcmdzLnJldHJ5UHJvbXB0IHx8IFwiSSBhbSBzb3JyeVwiXG4gIC8vIHNlc3Npb24uc2VuZChcIldoYXQgZG8geW91IHdhbnQ/XCIpXG4gIC8vXG4gIC8vIH0pXG5cbiAgdmFyIGRpYWxvZ1VwRG93biA9IG5ldyBidWlsZGVyLkludGVudERpYWxvZyh7IHJlY29nbml6ZXJzOiBbbmV3IFNpbXBsZVVwRG93blJlY29nbml6ZXIoKV0gfSk7XG5cbiAgYm90LmRpYWxvZygnL3VwZG93bicsIGRpYWxvZ1VwRG93bik7XG4gIGRpYWxvZ1VwRG93bi5vbkJlZ2luKGZ1bmN0aW9uIChzZXNzaW9uKSB7XG4gICAgc2Vzc2lvbi5zZW5kKFwiSGkgdGhlcmUsIHVwZG93biBpcyB3YWl0aW5nIGZvciB5b3VcIik7XG4gIH0pXG5cbiAgZGlhbG9nVXBEb3duLm1hdGNoZXMoJ2ludGVudC51cCcsIFtcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IGFyZ3MgfHwge307XG4gICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCAneW91IHdhbnQgdG8gZ28gdXAnKTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gcmVzdWx0cy5yZXBvbnNlO1xuICAgICAgbmV4dCgpO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgIHNlc3Npb24uZW5kRGlhbG9nV2l0aFJlc3VsdCh7IHJlc3BvbnNlOiBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjIH0pO1xuICAgIH1cbiAgXVxuICApO1xuXG4gIGRpYWxvZ1VwRG93bi5tYXRjaGVzKCdpbnRlbnQuZG93bicsIFtcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IGFyZ3MgfHwge307XG4gICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCAneW91IHdhbnQgdG8gZ28gZG93biEnKTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gLTE7IC8vIHJlc3VsdHMucmVwb25zZTtcbiAgICAgIG5leHQoKTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICBzZXNzaW9uLnNlbmQoXCJzdGlsbCBnb2luZyBkb3duP1wiKTtcbiAgICB9XG4gIF1cbiAgKTtcbiAgZGlhbG9nVXBEb3duLm9uRGVmYXVsdChmdW5jdGlvbiAoc2Vzc2lvbikge1xuICAgIGxvZ1F1ZXJ5KHNlc3Npb24sIFwib25EZWZhdWx0XCIpO1xuICAgIHNlc3Npb24uc2VuZChcIllvdSBhcmUgdHJhcHBlZCBpbiBhIGRpYWxvZyB3aGljaCBvbmx5IHVuZGVyc3RhbmRzIHVwIGFuZCBkb3duLCBvbmUgb2YgdGhlbSB3aWxsIGdldCB5b3Ugb3V0XCIpO1xuICAgIC8vYnVpbGRlci5EaWFsb2dBY3Rpb24uc2VuZCgnSVxcJ20gc29ycnkgSSBkaWRuXFwndCB1bmRlcnN0YW5kLiBJIGNhbiBvbmx5IHNob3cgc3RhcnQgYW5kIHJpbmcnKTtcbiAgfSk7XG5cblxuICBib3QuZGlhbG9nKCcvdHJhaW4nLCBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbGdvRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ0RvIHlvdSB3YW50IHRvIHRyYWluIG1lJyk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IHJlc3VsdHMucmVwb25zZTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoeyByZXNwb25zZTogc2Vzc2lvbi5EaWFsb2dEYXRhLmFiYyB9KTtcbiAgICB9XG4gIF0pO1xuXG5cbiAgYm90LmRpYWxvZygnLycsIGRpYWxvZyk7XG5cbiAgZGlhbG9nLm1hdGNoZXMoJ1Nob3dNZScsIFtcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgdmFyIGlzQ29tYmluZWRJbmRleCA9IHt9O1xuICAgICAgdmFyIG9OZXdFbnRpdHk7XG4gICAgICAvLyBleHBlY3RpbmcgZW50aXR5IEExXG4gICAgICBkZWJ1Z2xvZyhcIlNob3cgRW50aXR5XCIpO1xuICAgICAgY29uc29sZS5sb2coJ3JhdzogJyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpLCB1bmRlZmluZWQsIDIpO1xuICAgICAgdmFyIGExID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ0ExJyk7XG4gICAgICAvKlxuICAgICAgICAgICAgdmFyIGNsaWVudCA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdjbGllbnQnKTtcbiAgICAgICAgICAgIHZhciBzeXN0ZW1PYmplY3RJZCA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGNvbWJpbmVkRW50aXRpZXMsICdzeXN0ZW1PYmplY3RJZCcpIHx8XG4gICAgICAgICAgICAgIGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGNvbWJpbmVkRW50aXRpZXMsICdTeXN0ZW1PYmplY3QnKSB8fFxuICAgICAgICAgICAgICBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnYnVpbHRpbi5udW1iZXInKTtcbiAgICAgICAgICAgIHZhciBzeXN0ZW1PYmplY3RDYXRlZ29yeSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdTeXN0ZW1PYmplY3RDYXRlZ29yeScpO1xuXG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuc3lzdGVtID0ge1xuICAgICAgICAgICAgICBzeXN0ZW1JZDogc3lzdGVtSWQsXG4gICAgICAgICAgICAgIGNsaWVudDogY2xpZW50XG4gICAgICAgICAgICB9O1xuICAgICAgKi9cbiAgICAgIC8qXG4gICAgICAgICAgICB2YXIgc1N5c3RlbUlkID0gc3lzdGVtSWQgJiYgc3lzdGVtSWQuZW50aXR5O1xuICAgICAgICAgICAgdmFyIHNDbGllbnQgPSBjbGllbnQgJiYgY2xpZW50LmVudGl0eTtcbiAgICAgICAgICAgIHZhciBzc3lzdGVtT2JqZWN0SWQgPSBzeXN0ZW1PYmplY3RJZCAmJiBzeXN0ZW1PYmplY3RJZC5lbnRpdHk7XG4gICAgICAgICAgICB2YXIgc1N5c3RlbU9iamVjdENhdGVnb3J5ID0gc3lzdGVtT2JqZWN0Q2F0ZWdvcnkgJiYgc3lzdGVtT2JqZWN0Q2F0ZWdvcnkuZW50aXR5O1xuICAgICAgKi9cbiAgICAvL2lmIChuZXdGbG93KSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBBbmFseXplLmFuYWx5emVBbGwoYTEuZW50aXR5LFxuICAgICAgICAgIHRoZU1vZGVsLm1SdWxlcywgdGhlTW9kZWwudG9vbHMpO1xuXG4gICAgIC8vIH0gZWxzZSB7XG5cbiAgICAgICAgLy8gIGNvbnN0IHJlc3VsdCA9IEFuYWx5emUuYW5hbHl6ZUFsbChhMS5lbnRpdHksXG4gICAgICAgIC8vICAgICBtUnVsZXMsIHRvb2xzKTtcbiAgICAgLy8gfVxuICAgICAgbG9nUXVlcnkoc2Vzc2lvbiwgJ1Nob3dNZScsIHJlc3VsdCk7XG4gICAgICAvLyB0ZXN0LmV4cGVjdCgzKVxuICAgICAgLy8gIHRlc3QuZGVlcEVxdWFsKHJlc3VsdC53ZWlnaHQsIDEyMCwgJ2NvcnJlY3Qgd2VpZ2h0Jyk7XG4gICAgICBpZiAoIXJlc3VsdCB8fCByZXN1bHQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH1cbiAgICAgIC8vIGRlYnVnbG9nKCdyZXN1bHQgOiAnICsgSlNPTi5zdHJpbmdpZnkocmVzdWx0LCB1bmRlZmluZWQsIDIpKTtcbiAgICAgIGRlYnVnbG9nKCdiZXN0IHJlc3VsdCA6ICcgKyBKU09OLnN0cmluZ2lmeShyZXN1bHRbMF0gfHwge30sIHVuZGVmaW5lZCwgMikpO1xuICAgICAgZGVidWdsb2coJ3RvcCA6ICcgKyBNYXRjaC5Ub29sTWF0Y2guZHVtcFdlaWdodHNUb3AocmVzdWx0LCB7IHRvcDogMyB9KSk7XG5cblxuICAgICAgaWYgKEFuYWx5emUuaXNDb21wbGV0ZShyZXN1bHRbMF0pKSB7XG4gICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQgPSByZXN1bHRbMF07XG4gICAgICAgIHNlc3Npb24uc2VuZCgnU2hvd2luZyBlbnRpdHkgLi4uJyk7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0gZWxzZSBpZiAoQW5hbHl6ZS5nZXRQcm9tcHQocmVzdWx0WzBdKSkge1xuICAgICAgICB2YXIgcHJvbXB0ID0gQW5hbHl6ZS5nZXRQcm9tcHQocmVzdWx0WzBdKTtcbiAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCA9IHJlc3VsdFswXTtcbiAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnByb21wdCA9IHByb21wdDtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKFwiTm90IGVub3VnaCBpbmZvcm1hdGlvbiBzdXBwbGllZDogXCIgKyBNYXRjaC5Ub29sTWF0Y2guZHVtcE5pY2UoXG4gICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdFxuICAgICAgICApKTtcbiAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgcHJvbXB0LnRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGJlc3QgPSByZXN1bHQubGVuZ3RoID8gTWF0Y2guVG9vbE1hdGNoLmR1bXBOaWNlKHJlc3VsdFswXSkgOiBcIjxub3RoaW5nPlwiO1xuICAgICAgICAvL3Nlc3Npb24uc2VuZCgnSSBkaWQgbm90IHVuZGVyc3RhbmQgdGhpcycgKyBiZXN0KTtcbiAgICAgICAgdmFyIHJlcGx5ID1cbiAgICAgICAgICBuZXcgYnVpbGRlci5NZXNzYWdlKHNlc3Npb24pXG4gICAgICAgICAgICAudGV4dCgnSSBkaWQgbm90IHVuZGVyc3RhbmQgdGhpcycgKyBiZXN0KVxuICAgICAgICAgICAgLmFkZEVudGl0eSh7IHVybDogXCJJIGRvbid0IGtub3dcIiB9KTtcbiAgICAgICAgLy8gLmFkZEF0dGFjaG1lbnQoeyBmYWxsYmFja1RleHQ6IFwiSSBkb24ndCBrbm93XCIsIGNvbnRlbnRUeXBlOiAnaW1hZ2UvanBlZycsIGNvbnRlbnRVcmw6IFwid3d3LndvbWJhdC5vcmdcIiB9KTtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKHJlcGx5KTtcblxuICAgICAgfVxuXG4gICAgICAvKlxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1Nob3cgZW50aXRpZXM6ICcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzLCB1bmRlZmluZWQsIDIpKTtcblxuICAgICAgICAgICAgLy8gZG8gdGhlIGJpZyBhbmFseWlzIC4uLlxuICAgICAgICAgICAgICAgICAgdmFyIHUgPSBkaXNwYXRjaGVyLmV4ZWNTaG93RW50aXR5KHtcbiAgICAgICAgICAgICAgc3lzdGVtSWQ6IHNTeXN0ZW1JZCxcbiAgICAgICAgICAgICAgY2xpZW50OiBzQ2xpZW50LFxuICAgICAgICAgICAgICB0b29sOiBzVG9vbCxcbiAgICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6IHNTeXN0ZW1PYmplY3RDYXRlZ29yeSxcbiAgICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IHNzeXN0ZW1PYmplY3RJZFxuICAgICAgICAgICAgfSlcbiAgICAgICovXG5cbiAgICAgIC8vICBzZXNzaW9uLnNlbmQoJ1Nob3dpbmcgZW50aXR5IC4uLicpO1xuXG4gICAgICAvLyAgY29uc29sZS5sb2coXCJzaG93IGVudGl0eSwgU2hvdyBzZXNzaW9uIDogXCIgKyBKU09OLnN0cmluZ2lmeShzZXNzaW9uKSlcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwiU2hvdyBlbnRpdHkgOiBcIiArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpKVxuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgIHZhciByZXN1bHQgPSBzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0O1xuICAgICAgaWYgKCFyZXN1bHQgfHwgcmVzdWx0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXN1bHRzLnJlc3BvbnNlKSB7XG4gICAgICAgIC8vIHNvbWUgcHJvbXB0aW5nXG4gICAgICAgIEFuYWx5emUuc2V0UHJvbXB0KHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQsIHNlc3Npb24uZGlhbG9nRGF0YS5wcm9tcHQsIHJlc3VsdHMucmVzcG9uc2UpO1xuICAgICAgfVxuICAgICAgaWYgKEFuYWx5emUuaXNDb21wbGV0ZShzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0KSkge1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9IGVsc2UgaWYgKEFuYWx5emUuZ2V0UHJvbXB0KHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpKSB7XG4gICAgICAgIHZhciBwcm9tcHQgPSBBbmFseXplLmdldFByb21wdChzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0KTtcbiAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnByb21wdCA9IHByb21wdDtcbiAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgcHJvbXB0LnRleHQpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgIHZhciByZXN1bHQgPSBzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0O1xuICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgLy8gc29tZSBwcm9tcHRpbmdcbiAgICAgICAgQW5hbHl6ZS5zZXRQcm9tcHQoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCxcbiAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEucHJvbXB0LCByZXN1bHRzLnJlc3BvbnNlKTtcbiAgICAgIH1cbiAgICAgIGlmIChBbmFseXplLmlzQ29tcGxldGUoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCkpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy9zZXNzaW9uLnNlbmQoXCJzdGFydGluZyAgPiBcIiArXG4gICAgIC8vICAgaWYgKG5ld0Zsb3cpIHtcbiAgICAgICAgICBjb25zdCBleGVjID0gRXhlY1NlcnZlci5leGVjVG9vbChzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0IGFzIElNYXRjaC5JVG9vbE1hdGNoLCB0aGVNb2RlbC5yZWNvcmRzKTtcbiAgICAgLy8gICAgICAgICApXG4vL30gZWxzZSB7XG4vLyAgdmFyIGV4ZWMgPSBFeGVjLmV4ZWNUb29sKHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQgYXMgSU1hdGNoLklUb29sTWF0Y2gpO1xuLy99XG5cbnZhciByZXBseSA9IG5ldyBidWlsZGVyLk1lc3NhZ2Uoc2Vzc2lvbilcbiAgLnRleHQoZXhlYy50ZXh0KVxuICAuYWRkRW50aXR5KGV4ZWMuYWN0aW9uKTtcbi8vIC5hZGRBdHRhY2htZW50KHsgZmFsbGJhY2tUZXh0OiBcIkkgZG9uJ3Qga25vd1wiLCBjb250ZW50VHlwZTogJ2ltYWdlL2pwZWcnLCBjb250ZW50VXJsOiBcInd3dy53b21iYXQub3JnXCIgfSk7XG5zZXNzaW9uLnNlbmQocmVwbHkpO1xuXG4gICAgICB9IGVsc2Uge1xuICBpZiAoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCkge1xuICAgIHNlc3Npb24uc2VuZChcIk5vdCBlbm91Z2ggaW5mb3JtYXRpb24gc3VwcGxpZWQ6IFwiICsgTWF0Y2guVG9vbE1hdGNoLmR1bXBOaWNlKFxuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdFxuICAgICkpO1xuICB9IGVsc2Uge1xuICAgIHNlc3Npb24uc2VuZChcIkkgZGlkIG5vdCBnZXQgd2hhdCB5b3Ugd2FudFwiKTtcbiAgfVxufVxuICAgIH0sXG4gIF0pO1xuXG5kaWFsb2cubWF0Y2hlcygnV3JvbmcnLCBbXG4gIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgc2Vzc2lvbi5iZWdpbkRpYWxvZygnL3VwZG93bicsIHNlc3Npb24udXNlckRhdGEuY291bnQpO1xuICB9LFxuICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICBzZXNzaW9uLnNlbmQoXCJiYWNrIGZyb20gd3JvbmcgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJlc3VsdHMpKTtcbiAgICBuZXh0KCk7XG4gIH0sXG4gIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgc2Vzc2lvbi5zZW5kKCdlbmQgb2Ygd3JvbmcnKTtcbiAgfVxuXSk7XG5cbmRpYWxvZy5tYXRjaGVzKCdFeGl0JywgW1xuICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgIGNvbnNvbGUubG9nKCdleGl0IDonKTtcbiAgICBjb25zb2xlLmxvZygnZXhpdCcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzKSk7XG4gICAgc2Vzc2lvbi5zZW5kKFwieW91IGFyZSBpbiBhIGxvZ2ljIGxvb3AgXCIpO1xuICB9XG5dKTtcbmRpYWxvZy5tYXRjaGVzKCdIZWxwJywgW1xuICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgIGNvbnNvbGUubG9nKCdoZWxwIDonKTtcbiAgICBjb25zb2xlLmxvZygnaGVscCcpO1xuICAgIHNlc3Npb24uc2VuZChcIkkga25vdyBhYm91dCAuLi4uIDxjYXRlZ29yaWVzPj5cIik7XG4gIH1cbl0pO1xuXG5cblxuLy8gQWRkIGludGVudCBoYW5kbGVyc1xuZGlhbG9nLm1hdGNoZXMoJ3RyYWluJywgW1xuICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgIGNvbnNvbGUubG9nKCd0cmFpbicpO1xuICAgIC8vIFJlc29sdmUgYW5kIHN0b3JlIGFueSBlbnRpdGllcyBwYXNzZWQgZnJvbSBMVUlTLlxuICAgIHZhciB0aXRsZSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdidWlsdGluLmFsYXJtLnRpdGxlJyk7XG4gICAgdmFyIHRpbWUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIucmVzb2x2ZVRpbWUoYXJncy5lbnRpdGllcyk7XG4gICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtID0ge1xuICAgICAgdGl0bGU6IHRpdGxlID8gdGl0bGUuZW50aXR5IDogbnVsbCxcbiAgICAgIHRpbWVzdGFtcDogdGltZSA/IHRpbWUuZ2V0VGltZSgpIDogbnVsbFxuICAgIH07XG4gICAgLy8gUHJvbXB0IGZvciB0aXRsZVxuICAgIGlmICghYWxhcm0udGl0bGUpIHtcbiAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdXaGF0IGZhY3Qgd291bGQgeW91IGxpa2UgdG8gdHJhaW4/Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5leHQoKTtcbiAgICB9XG4gIH0sXG4gIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgIGlmIChyZXN1bHRzLnJlc3BvbnNlKSB7XG4gICAgICBhbGFybS50aXRsZSA9IHJlc3VsdHMucmVzcG9uc2U7XG4gICAgfVxuXG4gICAgLy8gUHJvbXB0IGZvciB0aW1lICh0aXRsZSB3aWxsIGJlIGJsYW5rIGlmIHRoZSB1c2VyIHNhaWQgY2FuY2VsKVxuICAgIGlmIChhbGFybS50aXRsZSAmJiAhYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICBidWlsZGVyLlByb21wdHMudGltZShzZXNzaW9uLCAnV2hhdCB0aW1lIHdvdWxkIHlvdSBsaWtlIHRvIHNldCB0aGUgYWxhcm0gZm9yPycpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXh0KCk7XG4gICAgfVxuICB9LFxuICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICBpZiAocmVzdWx0cy5yZXNwb25zZSkge1xuICAgICAgdmFyIHRpbWUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIucmVzb2x2ZVRpbWUoW3Jlc3VsdHMucmVzcG9uc2VdKTtcbiAgICAgIGFsYXJtLnRpbWVzdGFtcCA9IHRpbWUgPyB0aW1lLmdldFRpbWUoKSA6IG51bGw7XG4gICAgfVxuICAgIC8vIFNldCB0aGUgYWxhcm0gKGlmIHRpdGxlIG9yIHRpbWVzdGFtcCBpcyBibGFuayB0aGUgdXNlciBzYWlkIGNhbmNlbClcbiAgICBpZiAoYWxhcm0udGl0bGUgJiYgYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAvLyBTYXZlIGFkZHJlc3Mgb2Ygd2hvIHRvIG5vdGlmeSBhbmQgd3JpdGUgdG8gc2NoZWR1bGVyLlxuICAgICAgYWxhcm0uYWRkcmVzcyA9IHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzO1xuICAgICAgLy9hbGFybXNbYWxhcm0udGl0bGVdID0gYWxhcm07XG5cbiAgICAgIC8vIFNlbmQgY29uZmlybWF0aW9uIHRvIHVzZXJcbiAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoYWxhcm0udGltZXN0YW1wKTtcbiAgICAgIHZhciBpc0FNID0gZGF0ZS5nZXRIb3VycygpIDwgMTI7XG4gICAgICBzZXNzaW9uLnNlbmQoJ0NyZWF0aW5nIGFsYXJtIG5hbWVkIFwiJXNcIiBmb3IgJWQvJWQvJWQgJWQ6JTAyZCVzJyxcbiAgICAgICAgYWxhcm0udGl0bGUsXG4gICAgICAgIGRhdGUuZ2V0TW9udGgoKSArIDEsIGRhdGUuZ2V0RGF0ZSgpLCBkYXRlLmdldEZ1bGxZZWFyKCksXG4gICAgICAgIGlzQU0gPyBkYXRlLmdldEhvdXJzKCkgOiBkYXRlLmdldEhvdXJzKCkgLSAxMiwgZGF0ZS5nZXRNaW51dGVzKCksIGlzQU0gPyAnYW0nIDogJ3BtJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlc3Npb24uc2VuZCgnT2suLi4gbm8gcHJvYmxlbS4nKTtcbiAgICB9XG4gIH1cbl0pO1xuXG5kaWFsb2cub25EZWZhdWx0KGZ1bmN0aW9uIChzZXNzaW9uKSB7XG4gIGxvZ1F1ZXJ5KHNlc3Npb24sIFwib25EZWZhdWx0XCIpO1xuICB2YXIgZWxpemEgPSBnZXRFbGl6YUJvdChnZXRDb252ZXJzYXRpb25JZChzZXNzaW9uKSk7XG4gIHZhciByZXBseSA9IGVsaXphLnRyYW5zZm9ybShzZXNzaW9uLm1lc3NhZ2UudGV4dCk7XG4gIHNlc3Npb24uc2VuZChyZXBseSk7XG4gIC8vbmV3IEVpbHphYm90XG4gIC8vc2Vzc2lvbi5zZW5kKFwiSSBkbyBub3QgdW5kZXJzdGFuZCB0aGlzIGF0IGFsbFwiKTtcbiAgLy9idWlsZGVyLkRpYWxvZ0FjdGlvbi5zZW5kKCdJXFwnbSBzb3JyeSBJIGRpZG5cXCd0IHVuZGVyc3RhbmQuIEkgY2FuIG9ubHkgc2hvdyBzdGFydCBhbmQgcmluZycpO1xufSk7XG5cbiAgLypcbiAgLy8gVmVyeSBzaW1wbGUgYWxhcm0gc2NoZWR1bGVyXG4gIHZhciBhbGFybXMgPSB7fTtcbiAgc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICBmb3IgKHZhciBrZXkgaW4gYWxhcm1zKSB7XG4gICAgICB2YXIgYWxhcm0gPSBhbGFybXNba2V5XTtcbiAgICAgIGlmIChub3cgPj0gYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgIHZhciBtc2cgPSBuZXcgYnVpbGRlci5NZXNzYWdlKClcbiAgICAgICAgICAuYWRkcmVzcyhhbGFybS5hZGRyZXNzKVxuICAgICAgICAgIC50ZXh0KCdIZXJlXFwncyB5b3VyIFxcJyVzXFwnIGFsYXJtLicsIGFsYXJtLnRpdGxlKTtcbiAgICAgICAgYm90LnNlbmQobXNnKTtcbiAgICAgICAgZGVsZXRlIGFsYXJtc1trZXldO1xuICAgICAgfVxuICAgIH1cbiAgfSwgMTUwMDApO1xuICAqL1xufVxuXG5pZiAobW9kdWxlKSB7XG4gIG1vZHVsZS5leHBvcnRzID0ge1xuICAgIG1ha2VCb3Q6IG1ha2VCb3RcbiAgfTtcbn1cbiIsIi8qKlxuICogVGhlIGJvdCBpbXBsZW1lbnRhdGlvblxuICpcbiAqIEluc3RhbnRpYXRlIGFwc3NpbmcgYSBjb25uZWN0b3IgdmlhXG4gKiBtYWtlQm90XG4gKlxuICovXG4vKipcbiAqIEBmaWxlXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5zbWFydGRpYWxvZ1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG4vL2RlY2xhcmUgbW9kdWxlICdlbGl6YWJvdCcgeyB9O1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgYnVpbGRlciA9IHJlcXVpcmUoJ2JvdGJ1aWxkZXInKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJyk7XG52YXIgTWF0Y2ggPSByZXF1aXJlKCcuLi9tYXRjaC9tYXRjaCcpO1xudmFyIEFuYWx5emUgPSByZXF1aXJlKCcuLi9tYXRjaC9hbmFseXplJyk7XG52YXIgZWxpemFib3QgPSByZXF1aXJlKCdlbGl6YWJvdCcpO1xuLy9pbXBvcnQgKiBhcyBlbGl6YWJvdCBmcm9tICdlbGl6YWJvdCc7XG52YXIgZGVidWdsb2cgPSBkZWJ1Zygnc21hcnRkaWFsb2cnKTtcbnZhciBQbGFpblJlY29nbml6ZXIgPSByZXF1aXJlKCcuL3BsYWlucmVjb2duaXplcicpO1xuLy92YXIgYnVpbGRlciA9IHJlcXVpcmUoJ2JvdGJ1aWxkZXInKTtcbnZhciBkaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vbWF0Y2gvZGlzcGF0Y2hlci5qcycpLmRpc3BhdGNoZXI7XG5mdW5jdGlvbiBnZXRDb252ZXJzYXRpb25JZChzZXNzaW9uKSB7XG4gICAgcmV0dXJuIHNlc3Npb24ubWVzc2FnZSAmJlxuICAgICAgICBzZXNzaW9uLm1lc3NhZ2UuYWRkcmVzcyAmJlxuICAgICAgICBzZXNzaW9uLm1lc3NhZ2UuYWRkcmVzcy5jb252ZXJzYXRpb24uaWQ7XG59XG52YXIgZWxpemFib3RzID0ge307XG5mdW5jdGlvbiBnZXRFbGl6YUJvdChpZCkge1xuICAgIGlmICghZWxpemFib3RzW2lkXSkge1xuICAgICAgICBlbGl6YWJvdHNbaWRdID0ge1xuICAgICAgICAgICAgYWNjZXNzOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgZWxpemFib3Q6IG5ldyBlbGl6YWJvdCgpXG4gICAgICAgIH07XG4gICAgfVxuICAgIGVsaXphYm90c1tpZF0uYWNjZXNzID0gbmV3IERhdGUoKTtcbiAgICByZXR1cm4gZWxpemFib3RzW2lkXS5lbGl6YWJvdDtcbn1cbnZhciBuZXdGbG93ID0gdHJ1ZTtcbnZhciBNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVsL21vZGVsJyk7XG52YXIgRXhlY1NlcnZlciA9IHJlcXVpcmUoJy4uL2V4ZWMvZXhlY3NlcnZlcicpO1xudmFyIHRoZU1vZGVsID0gTW9kZWwubG9hZE1vZGVscygpO1xuaWYgKG5ld0Zsb3cpIHtcbn1cbmVsc2Uge1xufVxudmFyIFNpbXBsZVJlY29nbml6ZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFNpbXBsZVJlY29nbml6ZXIoKSB7XG4gICAgfVxuICAgIFNpbXBsZVJlY29nbml6ZXIucHJvdG90eXBlLnJlY29nbml6ZSA9IGZ1bmN0aW9uIChjb250ZXh0LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgdSA9IHt9O1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlY29nbml6aW5nIFwiICsgY29udGV4dC5tZXNzYWdlLnRleHQpO1xuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInN0YXJ0XCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJTaG93RW50aXR5XCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJzdGFydCBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwidHJhaW5cIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcInRyYWluXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwibGVhcm5cIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcImxlYXJuXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS50eXBlID0gXCJ0cmFpbkZhY3RcIjtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInRyYWluIFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJoZWxwXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJoZWxwXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiZXhpdFwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwiZXhpdFwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwid3JvbmdcIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcIndyb25nXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJ3JlY29nbml6aW5nIG5vdGhpbmcnKTtcbiAgICAgICAgdS5pbnRlbnQgPSBcIk5vbmVcIjtcbiAgICAgICAgdS5zY29yZSA9IDAuMTtcbiAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgZTEuc2NvcmUgPSAwLjE7XG4gICAgICAgIHUuZW50aXRpZXMgPSBbXTtcbiAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICB9O1xuICAgIHJldHVybiBTaW1wbGVSZWNvZ25pemVyO1xufSgpKTtcbnZhciBTaW1wbGVVcERvd25SZWNvZ25pemVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTaW1wbGVVcERvd25SZWNvZ25pemVyKCkge1xuICAgIH1cbiAgICBTaW1wbGVVcERvd25SZWNvZ25pemVyLnByb3RvdHlwZS5yZWNvZ25pemUgPSBmdW5jdGlvbiAoY29udGV4dCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHUgPSB7fTtcbiAgICAgICAgY29uc29sZS5sb2coXCJyZWNvZ25pemluZyBcIiArIGNvbnRleHQubWVzc2FnZS50ZXh0KTtcbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJkb3duXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJpbnRlbnQuZG93blwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwic3RhcnQgXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInVwXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJpbnRlbnQudXBcIjtcbiAgICAgICAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInVwXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygncmVjb2duaXppbmcgbm90aGluZycpO1xuICAgICAgICB1LmludGVudCA9IFwiTm9uZVwiO1xuICAgICAgICB1LnNjb3JlID0gMC4xO1xuICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICBlMS5zY29yZSA9IDAuMTtcbiAgICAgICAgdS5lbnRpdGllcyA9IFtdO1xuICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgIH07XG4gICAgcmV0dXJuIFNpbXBsZVVwRG93blJlY29nbml6ZXI7XG59KCkpO1xudmFyIEFueU9iamVjdCA9IE9iamVjdDtcbi8vIGdsb2JhbFR1bm5lbC5pbml0aWFsaXplKHtcbi8vICBob3N0OiAncHJveHkuZXh4eGFtcGxlLmNvbScsXG4vLyAgcG9ydDogODA4MFxuLy8gfSlcbi8vIENyZWF0ZSBib3QgYW5kIGJpbmQgdG8gY29uc29sZVxuLy8gdmFyIGNvbm5lY3RvciA9IG5ldyBodG1sY29ubmVjdG9yLkhUTUxDb25uZWN0b3IoKVxuLy8gY29ubmVjdG9yLnNldEFuc3dlckhvb2soZnVuY3Rpb24gKHNBbnN3ZXIpIHtcbi8vICBjb25zb2xlLmxvZygnR290IGFuc3dlciA6ICcgKyBzQW5zd2VyICsgJ1xcbicpXG4vLyB9KVxudmFyIGJvdDtcbi8vIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuLy8gICBjb25uZWN0b3IucHJvY2Vzc01lc3NhZ2UoJ3N0YXJ0IHVuaXQgdGVzdCBBQkMgJylcbi8vIH0sIDUwMDApXG52YXIgZnMgPSByZXF1aXJlKCdmcycpO1xudmFyIG9KU09OID0gSlNPTi5wYXJzZSgnJyArIGZzLnJlYWRGaWxlU3luYygnLi9yZXNvdXJjZXMvbW9kZWwvaW50ZW50cy5qc29uJykpO1xudmFyIG9SdWxlcyA9IFBsYWluUmVjb2duaXplci5wYXJzZVJ1bGVzKG9KU09OKTtcbi8vIHZhciBSZWNvZ25pemVyID0gbmV3IChyZWNvZ25pemVyLlJlZ0V4cFJlY29nbml6ZXIpKG9SdWxlcyk7XG5mdW5jdGlvbiBsb2dRdWVyeShzZXNzaW9uLCBpbnRlbnQsIHJlc3VsdCkge1xuICAgIGZzLmFwcGVuZEZpbGUoJy4vbG9ncy9zaG93bWVxdWVyaWVzLnR4dCcsIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHRleHQ6IHNlc3Npb24ubWVzc2FnZS50ZXh0LFxuICAgICAgICB0aW1lc3RhbXA6IHNlc3Npb24ubWVzc2FnZS50aW1lc3RhbXAsXG4gICAgICAgIGludGVudDogaW50ZW50LFxuICAgICAgICByZXM6IHJlc3VsdCAmJiByZXN1bHQubGVuZ3RoICYmIE1hdGNoLlRvb2xNYXRjaC5kdW1wTmljZShyZXN1bHRbMF0pIHx8IFwiMFwiLFxuICAgICAgICBjb252ZXJzYXRpb25JZDogc2Vzc2lvbi5tZXNzYWdlLmFkZHJlc3NcbiAgICAgICAgICAgICYmIHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzLmNvbnZlcnNhdGlvblxuICAgICAgICAgICAgJiYgc2Vzc2lvbi5tZXNzYWdlLmFkZHJlc3MuY29udmVyc2F0aW9uLmlkIHx8IFwiXCIsXG4gICAgICAgIHVzZXJpZDogc2Vzc2lvbi5tZXNzYWdlLmFkZHJlc3NcbiAgICAgICAgICAgICYmIHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzLnVzZXJcbiAgICAgICAgICAgICYmIHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzLnVzZXIuaWQgfHwgXCJcIlxuICAgIH0pLCBmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgZGVidWdsb2coXCJsb2dnaW5nIGZhaWxlZCBcIiArIGVycik7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbi8qKlxuICogQ29uc3RydWN0IGEgYm90XG4gKiBAcGFyYW0gY29ubmVjdG9yIHtDb25uZWN0b3J9IHRoZSBjb25uZWN0b3IgdG8gdXNlXG4gKiBIVE1MQ29ubmVjdG9yXG4gKiBvciBjb25uZWN0b3IgPSBuZXcgYnVpbGRlci5Db25zb2xlQ29ubmVjdG9yKCkubGlzdGVuKClcbiAqL1xuZnVuY3Rpb24gbWFrZUJvdChjb25uZWN0b3IpIHtcbiAgICBib3QgPSBuZXcgYnVpbGRlci5Vbml2ZXJzYWxCb3QoY29ubmVjdG9yKTtcbiAgICAvLyBDcmVhdGUgTFVJUyByZWNvZ25pemVyIHRoYXQgcG9pbnRzIGF0IG91ciBtb2RlbCBhbmQgYWRkIGl0IGFzIHRoZSByb290ICcvJyBkaWFsb2cgZm9yIG91ciBDb3J0YW5hIEJvdC5cbiAgICAvLyB2YXIgbW9kZWwgPSBzZW5zaXRpdmUubW9kZWx1cmw7XG4gICAgLy8gdmFyIG1vZGVsID0gJ2h0dHBzOi8vYXBpLnByb2plY3RveGZvcmQuYWkvbHVpcy92Mi4wL2FwcHMvYzQxM2IyZWYtMzgyYy00NWJkLThmZjAtZjc2ZDYwZTJhODIxP3N1YnNjcmlwdGlvbi1rZXk9YzIxMzk4YjU5ODBhNGNlMDlmNDc0YmJmZWU5M2I4OTImcT0nXG4gICAgdmFyIHJlY29nbml6ZXIgPSBuZXcgUGxhaW5SZWNvZ25pemVyLlJlZ0V4cFJlY29nbml6ZXIob1J1bGVzKTtcbiAgICB2YXIgZGlhbG9nID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFtyZWNvZ25pemVyXSB9KTtcbiAgICAvLyBkaWFsb2cub25CZWdpbihmdW5jdGlvbihzZXNzaW9uLGFyZ3MpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcImJlZ2lubmluZyAuLi5cIilcbiAgICAvLyBzZXNzaW9uLmRpYWxvZ0RhdGEucmV0cnlQcm9tcHQgPSBhcmdzICYmIGFyZ3MucmV0cnlQcm9tcHQgfHwgXCJJIGFtIHNvcnJ5XCJcbiAgICAvLyBzZXNzaW9uLnNlbmQoXCJXaGF0IGRvIHlvdSB3YW50P1wiKVxuICAgIC8vXG4gICAgLy8gfSlcbiAgICB2YXIgZGlhbG9nVXBEb3duID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFtuZXcgU2ltcGxlVXBEb3duUmVjb2duaXplcigpXSB9KTtcbiAgICBib3QuZGlhbG9nKCcvdXBkb3duJywgZGlhbG9nVXBEb3duKTtcbiAgICBkaWFsb2dVcERvd24ub25CZWdpbihmdW5jdGlvbiAoc2Vzc2lvbikge1xuICAgICAgICBzZXNzaW9uLnNlbmQoXCJIaSB0aGVyZSwgdXBkb3duIGlzIHdhaXRpbmcgZm9yIHlvdVwiKTtcbiAgICB9KTtcbiAgICBkaWFsb2dVcERvd24ubWF0Y2hlcygnaW50ZW50LnVwJywgW1xuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IGFyZ3MgfHwge307XG4gICAgICAgICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCAneW91IHdhbnQgdG8gZ28gdXAnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSByZXN1bHRzLnJlcG9uc2U7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoeyByZXNwb25zZTogc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyB9KTtcbiAgICAgICAgfVxuICAgIF0pO1xuICAgIGRpYWxvZ1VwRG93bi5tYXRjaGVzKCdpbnRlbnQuZG93bicsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ3lvdSB3YW50IHRvIGdvIGRvd24hJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gLTE7IC8vIHJlc3VsdHMucmVwb25zZTtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHNlc3Npb24uc2VuZChcInN0aWxsIGdvaW5nIGRvd24/XCIpO1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgZGlhbG9nVXBEb3duLm9uRGVmYXVsdChmdW5jdGlvbiAoc2Vzc2lvbikge1xuICAgICAgICBsb2dRdWVyeShzZXNzaW9uLCBcIm9uRGVmYXVsdFwiKTtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKFwiWW91IGFyZSB0cmFwcGVkIGluIGEgZGlhbG9nIHdoaWNoIG9ubHkgdW5kZXJzdGFuZHMgdXAgYW5kIGRvd24sIG9uZSBvZiB0aGVtIHdpbGwgZ2V0IHlvdSBvdXRcIik7XG4gICAgICAgIC8vYnVpbGRlci5EaWFsb2dBY3Rpb24uc2VuZCgnSVxcJ20gc29ycnkgSSBkaWRuXFwndCB1bmRlcnN0YW5kLiBJIGNhbiBvbmx5IHNob3cgc3RhcnQgYW5kIHJpbmcnKTtcbiAgICB9KTtcbiAgICBib3QuZGlhbG9nKCcvdHJhaW4nLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxnb0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdEbyB5b3Ugd2FudCB0byB0cmFpbiBtZScpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IHJlc3VsdHMucmVwb25zZTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZW5kRGlhbG9nV2l0aFJlc3VsdCh7IHJlc3BvbnNlOiBzZXNzaW9uLkRpYWxvZ0RhdGEuYWJjIH0pO1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgYm90LmRpYWxvZygnLycsIGRpYWxvZyk7XG4gICAgZGlhbG9nLm1hdGNoZXMoJ1Nob3dNZScsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHZhciBpc0NvbWJpbmVkSW5kZXggPSB7fTtcbiAgICAgICAgICAgIHZhciBvTmV3RW50aXR5O1xuICAgICAgICAgICAgLy8gZXhwZWN0aW5nIGVudGl0eSBBMVxuICAgICAgICAgICAgZGVidWdsb2coXCJTaG93IEVudGl0eVwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyYXc6ICcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzKSwgdW5kZWZpbmVkLCAyKTtcbiAgICAgICAgICAgIHZhciBhMSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdBMScpO1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgIHZhciBjbGllbnQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnY2xpZW50Jyk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3lzdGVtT2JqZWN0SWQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnc3lzdGVtT2JqZWN0SWQnKSB8fFxuICAgICAgICAgICAgICAgICAgICBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnU3lzdGVtT2JqZWN0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ2J1aWx0aW4ubnVtYmVyJyk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3lzdGVtT2JqZWN0Q2F0ZWdvcnkgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnU3lzdGVtT2JqZWN0Q2F0ZWdvcnknKTtcbiAgICAgIFxuICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnN5c3RlbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtSWQ6IHN5c3RlbUlkLFxuICAgICAgICAgICAgICAgICAgICBjbGllbnQ6IGNsaWVudFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgdmFyIHNTeXN0ZW1JZCA9IHN5c3RlbUlkICYmIHN5c3RlbUlkLmVudGl0eTtcbiAgICAgICAgICAgICAgICAgIHZhciBzQ2xpZW50ID0gY2xpZW50ICYmIGNsaWVudC5lbnRpdHk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3N5c3RlbU9iamVjdElkID0gc3lzdGVtT2JqZWN0SWQgJiYgc3lzdGVtT2JqZWN0SWQuZW50aXR5O1xuICAgICAgICAgICAgICAgICAgdmFyIHNTeXN0ZW1PYmplY3RDYXRlZ29yeSA9IHN5c3RlbU9iamVjdENhdGVnb3J5ICYmIHN5c3RlbU9iamVjdENhdGVnb3J5LmVudGl0eTtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvL2lmIChuZXdGbG93KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gQW5hbHl6ZS5hbmFseXplQWxsKGExLmVudGl0eSwgdGhlTW9kZWwubVJ1bGVzLCB0aGVNb2RlbC50b29scyk7XG4gICAgICAgICAgICAvLyB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gIGNvbnN0IHJlc3VsdCA9IEFuYWx5emUuYW5hbHl6ZUFsbChhMS5lbnRpdHksXG4gICAgICAgICAgICAvLyAgICAgbVJ1bGVzLCB0b29scyk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICBsb2dRdWVyeShzZXNzaW9uLCAnU2hvd01lJywgcmVzdWx0KTtcbiAgICAgICAgICAgIC8vIHRlc3QuZXhwZWN0KDMpXG4gICAgICAgICAgICAvLyAgdGVzdC5kZWVwRXF1YWwocmVzdWx0LndlaWdodCwgMTIwLCAnY29ycmVjdCB3ZWlnaHQnKTtcbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8IHJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBkZWJ1Z2xvZygncmVzdWx0IDogJyArIEpTT04uc3RyaW5naWZ5KHJlc3VsdCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnYmVzdCByZXN1bHQgOiAnICsgSlNPTi5zdHJpbmdpZnkocmVzdWx0WzBdIHx8IHt9LCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgIGRlYnVnbG9nKCd0b3AgOiAnICsgTWF0Y2guVG9vbE1hdGNoLmR1bXBXZWlnaHRzVG9wKHJlc3VsdCwgeyB0b3A6IDMgfSkpO1xuICAgICAgICAgICAgaWYgKEFuYWx5emUuaXNDb21wbGV0ZShyZXN1bHRbMF0pKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCA9IHJlc3VsdFswXTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ1Nob3dpbmcgZW50aXR5IC4uLicpO1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKEFuYWx5emUuZ2V0UHJvbXB0KHJlc3VsdFswXSkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvbXB0ID0gQW5hbHl6ZS5nZXRQcm9tcHQocmVzdWx0WzBdKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0ID0gcmVzdWx0WzBdO1xuICAgICAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5wcm9tcHQgPSBwcm9tcHQ7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKFwiTm90IGVub3VnaCBpbmZvcm1hdGlvbiBzdXBwbGllZDogXCIgKyBNYXRjaC5Ub29sTWF0Y2guZHVtcE5pY2Uoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCkpO1xuICAgICAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sIHByb21wdC50ZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBiZXN0ID0gcmVzdWx0Lmxlbmd0aCA/IE1hdGNoLlRvb2xNYXRjaC5kdW1wTmljZShyZXN1bHRbMF0pIDogXCI8bm90aGluZz5cIjtcbiAgICAgICAgICAgICAgICAvL3Nlc3Npb24uc2VuZCgnSSBkaWQgbm90IHVuZGVyc3RhbmQgdGhpcycgKyBiZXN0KTtcbiAgICAgICAgICAgICAgICB2YXIgcmVwbHkgPSBuZXcgYnVpbGRlci5NZXNzYWdlKHNlc3Npb24pXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KCdJIGRpZCBub3QgdW5kZXJzdGFuZCB0aGlzJyArIGJlc3QpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRFbnRpdHkoeyB1cmw6IFwiSSBkb24ndCBrbm93XCIgfSk7XG4gICAgICAgICAgICAgICAgLy8gLmFkZEF0dGFjaG1lbnQoeyBmYWxsYmFja1RleHQ6IFwiSSBkb24ndCBrbm93XCIsIGNvbnRlbnRUeXBlOiAnaW1hZ2UvanBlZycsIGNvbnRlbnRVcmw6IFwid3d3LndvbWJhdC5vcmdcIiB9KTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQocmVwbHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTaG93IGVudGl0aWVzOiAnICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICBcbiAgICAgICAgICAgICAgICAgIC8vIGRvIHRoZSBiaWcgYW5hbHlpcyAuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1ID0gZGlzcGF0Y2hlci5leGVjU2hvd0VudGl0eSh7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbUlkOiBzU3lzdGVtSWQsXG4gICAgICAgICAgICAgICAgICAgIGNsaWVudDogc0NsaWVudCxcbiAgICAgICAgICAgICAgICAgICAgdG9vbDogc1Rvb2wsXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiBzU3lzdGVtT2JqZWN0Q2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBzc3lzdGVtT2JqZWN0SWRcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgLy8gIHNlc3Npb24uc2VuZCgnU2hvd2luZyBlbnRpdHkgLi4uJyk7XG4gICAgICAgICAgICAvLyAgY29uc29sZS5sb2coXCJzaG93IGVudGl0eSwgU2hvdyBzZXNzaW9uIDogXCIgKyBKU09OLnN0cmluZ2lmeShzZXNzaW9uKSlcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiU2hvdyBlbnRpdHkgOiBcIiArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpKVxuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQ7XG4gICAgICAgICAgICBpZiAoIXJlc3VsdCB8fCByZXN1bHQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBzb21lIHByb21wdGluZ1xuICAgICAgICAgICAgICAgIEFuYWx5emUuc2V0UHJvbXB0KHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQsIHNlc3Npb24uZGlhbG9nRGF0YS5wcm9tcHQsIHJlc3VsdHMucmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKEFuYWx5emUuaXNDb21wbGV0ZShzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0KSkge1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKEFuYWx5emUuZ2V0UHJvbXB0KHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb21wdCA9IEFuYWx5emUuZ2V0UHJvbXB0KHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpO1xuICAgICAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5wcm9tcHQgPSBwcm9tcHQ7XG4gICAgICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgcHJvbXB0LnRleHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQ7XG4gICAgICAgICAgICBpZiAocmVzdWx0cy5yZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIC8vIHNvbWUgcHJvbXB0aW5nXG4gICAgICAgICAgICAgICAgQW5hbHl6ZS5zZXRQcm9tcHQoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCwgc2Vzc2lvbi5kaWFsb2dEYXRhLnByb21wdCwgcmVzdWx0cy5yZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoQW5hbHl6ZS5pc0NvbXBsZXRlKHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvL3Nlc3Npb24uc2VuZChcInN0YXJ0aW5nICA+IFwiICtcbiAgICAgICAgICAgICAgICAvLyAgIGlmIChuZXdGbG93KSB7XG4gICAgICAgICAgICAgICAgdmFyIGV4ZWMgPSBFeGVjU2VydmVyLmV4ZWNUb29sKHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQsIHRoZU1vZGVsLnJlY29yZHMpO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgKVxuICAgICAgICAgICAgICAgIC8vfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyAgdmFyIGV4ZWMgPSBFeGVjLmV4ZWNUb29sKHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQgYXMgSU1hdGNoLklUb29sTWF0Y2gpO1xuICAgICAgICAgICAgICAgIC8vfVxuICAgICAgICAgICAgICAgIHZhciByZXBseSA9IG5ldyBidWlsZGVyLk1lc3NhZ2Uoc2Vzc2lvbilcbiAgICAgICAgICAgICAgICAgICAgLnRleHQoZXhlYy50ZXh0KVxuICAgICAgICAgICAgICAgICAgICAuYWRkRW50aXR5KGV4ZWMuYWN0aW9uKTtcbiAgICAgICAgICAgICAgICAvLyAuYWRkQXR0YWNobWVudCh7IGZhbGxiYWNrVGV4dDogXCJJIGRvbid0IGtub3dcIiwgY29udGVudFR5cGU6ICdpbWFnZS9qcGVnJywgY29udGVudFVybDogXCJ3d3cud29tYmF0Lm9yZ1wiIH0pO1xuICAgICAgICAgICAgICAgIHNlc3Npb24uc2VuZChyZXBseSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoXCJOb3QgZW5vdWdoIGluZm9ybWF0aW9uIHN1cHBsaWVkOiBcIiArIE1hdGNoLlRvb2xNYXRjaC5kdW1wTmljZShzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoXCJJIGRpZCBub3QgZ2V0IHdoYXQgeW91IHdhbnRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIF0pO1xuICAgIGRpYWxvZy5tYXRjaGVzKCdXcm9uZycsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uYmVnaW5EaWFsb2coJy91cGRvd24nLCBzZXNzaW9uLnVzZXJEYXRhLmNvdW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgICAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICAgICAgICAgIHNlc3Npb24uc2VuZChcImJhY2sgZnJvbSB3cm9uZyA6IFwiICsgSlNPTi5zdHJpbmdpZnkocmVzdWx0cykpO1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdlbmQgb2Ygd3JvbmcnKTtcbiAgICAgICAgfVxuICAgIF0pO1xuICAgIGRpYWxvZy5tYXRjaGVzKCdFeGl0JywgW1xuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2V4aXQgOicpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2V4aXQnICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcykpO1xuICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKFwieW91IGFyZSBpbiBhIGxvZ2ljIGxvb3AgXCIpO1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgZGlhbG9nLm1hdGNoZXMoJ0hlbHAnLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnaGVscCA6Jyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnaGVscCcpO1xuICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKFwiSSBrbm93IGFib3V0IC4uLi4gPGNhdGVnb3JpZXM+PlwiKTtcbiAgICAgICAgfVxuICAgIF0pO1xuICAgIC8vIEFkZCBpbnRlbnQgaGFuZGxlcnNcbiAgICBkaWFsb2cubWF0Y2hlcygndHJhaW4nLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndHJhaW4nKTtcbiAgICAgICAgICAgIC8vIFJlc29sdmUgYW5kIHN0b3JlIGFueSBlbnRpdGllcyBwYXNzZWQgZnJvbSBMVUlTLlxuICAgICAgICAgICAgdmFyIHRpdGxlID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ2J1aWx0aW4uYWxhcm0udGl0bGUnKTtcbiAgICAgICAgICAgIHZhciB0aW1lID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLnJlc29sdmVUaW1lKGFyZ3MuZW50aXRpZXMpO1xuICAgICAgICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtID0ge1xuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSA/IHRpdGxlLmVudGl0eSA6IG51bGwsXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiB0aW1lID8gdGltZS5nZXRUaW1lKCkgOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gUHJvbXB0IGZvciB0aXRsZVxuICAgICAgICAgICAgaWYgKCFhbGFybS50aXRsZSkge1xuICAgICAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdXaGF0IGZhY3Qgd291bGQgeW91IGxpa2UgdG8gdHJhaW4/Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm07XG4gICAgICAgICAgICBpZiAocmVzdWx0cy5yZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGFsYXJtLnRpdGxlID0gcmVzdWx0cy5yZXNwb25zZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFByb21wdCBmb3IgdGltZSAodGl0bGUgd2lsbCBiZSBibGFuayBpZiB0aGUgdXNlciBzYWlkIGNhbmNlbClcbiAgICAgICAgICAgIGlmIChhbGFybS50aXRsZSAmJiAhYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRpbWUoc2Vzc2lvbiwgJ1doYXQgdGltZSB3b3VsZCB5b3UgbGlrZSB0byBzZXQgdGhlIGFsYXJtIGZvcj8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLnJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIucmVzb2x2ZVRpbWUoW3Jlc3VsdHMucmVzcG9uc2VdKTtcbiAgICAgICAgICAgICAgICBhbGFybS50aW1lc3RhbXAgPSB0aW1lID8gdGltZS5nZXRUaW1lKCkgOiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU2V0IHRoZSBhbGFybSAoaWYgdGl0bGUgb3IgdGltZXN0YW1wIGlzIGJsYW5rIHRoZSB1c2VyIHNhaWQgY2FuY2VsKVxuICAgICAgICAgICAgaWYgKGFsYXJtLnRpdGxlICYmIGFsYXJtLnRpbWVzdGFtcCkge1xuICAgICAgICAgICAgICAgIC8vIFNhdmUgYWRkcmVzcyBvZiB3aG8gdG8gbm90aWZ5IGFuZCB3cml0ZSB0byBzY2hlZHVsZXIuXG4gICAgICAgICAgICAgICAgYWxhcm0uYWRkcmVzcyA9IHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzO1xuICAgICAgICAgICAgICAgIC8vYWxhcm1zW2FsYXJtLnRpdGxlXSA9IGFsYXJtO1xuICAgICAgICAgICAgICAgIC8vIFNlbmQgY29uZmlybWF0aW9uIHRvIHVzZXJcbiAgICAgICAgICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKGFsYXJtLnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgdmFyIGlzQU0gPSBkYXRlLmdldEhvdXJzKCkgPCAxMjtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ0NyZWF0aW5nIGFsYXJtIG5hbWVkIFwiJXNcIiBmb3IgJWQvJWQvJWQgJWQ6JTAyZCVzJywgYWxhcm0udGl0bGUsIGRhdGUuZ2V0TW9udGgoKSArIDEsIGRhdGUuZ2V0RGF0ZSgpLCBkYXRlLmdldEZ1bGxZZWFyKCksIGlzQU0gPyBkYXRlLmdldEhvdXJzKCkgOiBkYXRlLmdldEhvdXJzKCkgLSAxMiwgZGF0ZS5nZXRNaW51dGVzKCksIGlzQU0gPyAnYW0nIDogJ3BtJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ09rLi4uIG5vIHByb2JsZW0uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBkaWFsb2cub25EZWZhdWx0KGZ1bmN0aW9uIChzZXNzaW9uKSB7XG4gICAgICAgIGxvZ1F1ZXJ5KHNlc3Npb24sIFwib25EZWZhdWx0XCIpO1xuICAgICAgICB2YXIgZWxpemEgPSBnZXRFbGl6YUJvdChnZXRDb252ZXJzYXRpb25JZChzZXNzaW9uKSk7XG4gICAgICAgIHZhciByZXBseSA9IGVsaXphLnRyYW5zZm9ybShzZXNzaW9uLm1lc3NhZ2UudGV4dCk7XG4gICAgICAgIHNlc3Npb24uc2VuZChyZXBseSk7XG4gICAgICAgIC8vbmV3IEVpbHphYm90XG4gICAgICAgIC8vc2Vzc2lvbi5zZW5kKFwiSSBkbyBub3QgdW5kZXJzdGFuZCB0aGlzIGF0IGFsbFwiKTtcbiAgICAgICAgLy9idWlsZGVyLkRpYWxvZ0FjdGlvbi5zZW5kKCdJXFwnbSBzb3JyeSBJIGRpZG5cXCd0IHVuZGVyc3RhbmQuIEkgY2FuIG9ubHkgc2hvdyBzdGFydCBhbmQgcmluZycpO1xuICAgIH0pO1xuICAgIC8qXG4gICAgLy8gVmVyeSBzaW1wbGUgYWxhcm0gc2NoZWR1bGVyXG4gICAgdmFyIGFsYXJtcyA9IHt9O1xuICAgIHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgIGZvciAodmFyIGtleSBpbiBhbGFybXMpIHtcbiAgICAgICAgdmFyIGFsYXJtID0gYWxhcm1zW2tleV07XG4gICAgICAgIGlmIChub3cgPj0gYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgICAgdmFyIG1zZyA9IG5ldyBidWlsZGVyLk1lc3NhZ2UoKVxuICAgICAgICAgICAgLmFkZHJlc3MoYWxhcm0uYWRkcmVzcylcbiAgICAgICAgICAgIC50ZXh0KCdIZXJlXFwncyB5b3VyIFxcJyVzXFwnIGFsYXJtLicsIGFsYXJtLnRpdGxlKTtcbiAgICAgICAgICBib3Quc2VuZChtc2cpO1xuICAgICAgICAgIGRlbGV0ZSBhbGFybXNba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sIDE1MDAwKTtcbiAgICAqL1xufVxuaWYgKG1vZHVsZSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICBtYWtlQm90OiBtYWtlQm90XG4gICAgfTtcbn1cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
