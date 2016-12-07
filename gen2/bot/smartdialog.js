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
"use strict";

var builder = require('botbuilder');
var debug = require('debug');
var Exec = require('../exec/exec');
var Match = require('../match/match');
var Analyze = require('../match/analyze');
var debuglog = debug('smartdialog');
var PlainRecognizer = require('./plainrecognizer');
//var builder = require('botbuilder');
var dispatcher = require('../match/dispatcher.js').dispatcher;
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
            u.intent = "down";
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
            u.intent = "up";
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
        res: result && result.length && Match.ToolMatch.dumpNice(result[0]) || "0"
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
        session.endDialogWithResult({
            response: { res: "down", u: session.dialogData.abc }
        });
    }]);
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
            session.send('I did not understand this' + best);
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
            session.send("starting  > " + Exec.execTool(session.dialogData.result));
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
        session.send("I do not understand this at all");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9ib3Qvc21hcnRkaWFsb2cudHMiLCJib3Qvc21hcnRkaWFsb2cuanMiXSwibmFtZXMiOlsiYnVpbGRlciIsInJlcXVpcmUiLCJkZWJ1ZyIsIkV4ZWMiLCJNYXRjaCIsIkFuYWx5emUiLCJkZWJ1Z2xvZyIsIlBsYWluUmVjb2duaXplciIsImRpc3BhdGNoZXIiLCJUb29scyIsInRvb2xzIiwiZ2V0VG9vbHMiLCJJbnB1dEZpbHRlclJ1bGVzIiwibVJ1bGVzIiwiZ2V0TVJ1bGVzU2FtcGxlIiwiU2ltcGxlUmVjb2duaXplciIsInByb3RvdHlwZSIsInJlY29nbml6ZSIsImNvbnRleHQiLCJjYWxsYmFjayIsInUiLCJjb25zb2xlIiwibG9nIiwibWVzc2FnZSIsInRleHQiLCJpbmRleE9mIiwiaW50ZW50Iiwic2NvcmUiLCJlMSIsInN0YXJ0SW5kZXgiLCJsZW5ndGgiLCJlbmRJbmRleCIsImVudGl0aWVzIiwidW5kZWZpbmVkIiwidHlwZSIsIlNpbXBsZVVwRG93blJlY29nbml6ZXIiLCJBbnlPYmplY3QiLCJPYmplY3QiLCJib3QiLCJmcyIsIm9KU09OIiwiSlNPTiIsInBhcnNlIiwicmVhZEZpbGVTeW5jIiwib1J1bGVzIiwicGFyc2VSdWxlcyIsImxvZ1F1ZXJ5Iiwic2Vzc2lvbiIsInJlc3VsdCIsImFwcGVuZEZpbGUiLCJzdHJpbmdpZnkiLCJ0aW1lc3RhbXAiLCJyZXMiLCJUb29sTWF0Y2giLCJkdW1wTmljZSIsImVyciIsIm1ha2VCb3QiLCJjb25uZWN0b3IiLCJVbml2ZXJzYWxCb3QiLCJyZWNvZ25pemVyIiwiUmVnRXhwUmVjb2duaXplciIsImRpYWxvZyIsIkludGVudERpYWxvZyIsInJlY29nbml6ZXJzIiwiZGlhbG9nVXBEb3duIiwib25CZWdpbiIsInNlbmQiLCJtYXRjaGVzIiwiYXJncyIsIm5leHQiLCJkaWFsb2dEYXRhIiwiYWJjIiwiUHJvbXB0cyIsInJlc3VsdHMiLCJyZXBvbnNlIiwiZW5kRGlhbG9nV2l0aFJlc3VsdCIsInJlc3BvbnNlIiwiZGlhbGdvRGF0YSIsIkRpYWxvZ0RhdGEiLCJpc0NvbWJpbmVkSW5kZXgiLCJvTmV3RW50aXR5IiwiYTEiLCJFbnRpdHlSZWNvZ25pemVyIiwiZmluZEVudGl0eSIsImFuYWx5emVBbGwiLCJlbnRpdHkiLCJkdW1wV2VpZ2h0c1RvcCIsInRvcCIsImlzQ29tcGxldGUiLCJnZXRQcm9tcHQiLCJwcm9tcHQiLCJiZXN0Iiwic2V0UHJvbXB0IiwiZXhlY1Rvb2wiLCJiZWdpbkRpYWxvZyIsInVzZXJEYXRhIiwiY291bnQiLCJhbGFybSIsInRpdGxlIiwidGltZSIsInJlc29sdmVUaW1lIiwiZ2V0VGltZSIsImFkZHJlc3MiLCJkYXRlIiwiRGF0ZSIsImlzQU0iLCJnZXRIb3VycyIsImdldE1vbnRoIiwiZ2V0RGF0ZSIsImdldEZ1bGxZZWFyIiwiZ2V0TWludXRlcyIsIm9uRGVmYXVsdCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7O0FBT0E7Ozs7O0FDS0E7O0FERUEsSUFBWUEsVUFBT0MsUUFBTSxZQUFOLENBQW5CO0FBRUEsSUFBWUMsUUFBS0QsUUFBTSxPQUFOLENBQWpCO0FBRUEsSUFBWUUsT0FBSUYsUUFBTSxjQUFOLENBQWhCO0FBQ0EsSUFBWUcsUUFBS0gsUUFBTSxnQkFBTixDQUFqQjtBQUVBLElBQVlJLFVBQU9KLFFBQU0sa0JBQU4sQ0FBbkI7QUFFQSxJQUFJSyxXQUFXSixNQUFNLGFBQU4sQ0FBZjtBQUNBLElBQVlLLGtCQUFlTixRQUFNLG1CQUFOLENBQTNCO0FBQ0E7QUFFQSxJQUFJTyxhQUFhUCxRQUFRLHdCQUFSLEVBQWtDTyxVQUFuRDtBQUlBLElBQVlDLFFBQUtSLFFBQU0sZ0JBQU4sQ0FBakI7QUFFQSxJQUFNUyxRQUFRRCxNQUFNRSxRQUFOLEVBQWQ7QUFDQSxJQUFNQyxtQkFBbUJYLFFBQVEsOEJBQVIsQ0FBekI7QUFDQSxJQUFNWSxTQUFTRCxpQkFBaUJFLGVBQWpCLEVBQWY7QUFJQSxJQUFBQyxtQkFBQSxZQUFBO0FBQ0Us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S0FBS0csUUFBTCxFQUFQLEdBQXlCSCxLQUFLRyxRQUFMLEtBQWtCLEVBSDdDLEVBR2lESCxLQUFLTyxVQUFMLEVBSGpELEVBR29FTCxPQUFPLElBQVAsR0FBYyxJQUhsRjtBQUlELFNBWkQsTUFZTztBQUNMMUQsb0JBQVFtQixJQUFSLENBQWEsbUJBQWI7QUFDRDtBQUNGLEtBcERxQixDQUF4QjtBQXVEQUwsV0FBT2tELFNBQVAsQ0FBaUIsVUFBU2hFLE9BQVQsRUFBZ0I7QUFDL0JELGlCQUFTQyxPQUFULEVBQWtCLFdBQWxCO0FBQ0FBLGdCQUFRbUIsSUFBUixDQUFhLGlDQUFiO0FBQ0E7QUFDRCxLQUpEO0FBTUE7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUJEO0FBRUQsSUFBSThDLE1BQUosRUFBWTtBQUNWQSxXQUFPQyxPQUFQLEdBQWlCO0FBQ2Z6RCxpQkFBU0E7QUFETSxLQUFqQjtBQUdEIiwiZmlsZSI6ImJvdC9zbWFydGRpYWxvZy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVGhlIGJvdCBpbXBsZW1lbnRhdGlvblxuICpcbiAqIEluc3RhbnRpYXRlIGFwc3NpbmcgYSBjb25uZWN0b3IgdmlhXG4gKiBtYWtlQm90XG4gKlxuICovXG4vKipcbiAqIEBmaWxlXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5zbWFydGRpYWxvZ1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG5cblxuaW1wb3J0ICogYXMgYnVpbGRlciBmcm9tICdib3RidWlsZGVyJztcblxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xuXG5pbXBvcnQgKiBhcyBFeGVjIGZyb20gJy4uL2V4ZWMvZXhlYyc7XG5pbXBvcnQgKiBhcyBNYXRjaCBmcm9tICcuLi9tYXRjaC9tYXRjaCc7XG5cbmltcG9ydCAqIGFzIEFuYWx5emUgZnJvbSAnLi4vbWF0Y2gvYW5hbHl6ZSc7XG5cbmxldCBkZWJ1Z2xvZyA9IGRlYnVnKCdzbWFydGRpYWxvZycpO1xuaW1wb3J0ICogYXMgUGxhaW5SZWNvZ25pemVyIGZyb20gJy4vcGxhaW5yZWNvZ25pemVyJztcbi8vdmFyIGJ1aWxkZXIgPSByZXF1aXJlKCdib3RidWlsZGVyJyk7XG5cbnZhciBkaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vbWF0Y2gvZGlzcGF0Y2hlci5qcycpLmRpc3BhdGNoZXI7XG5cblxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xuaW1wb3J0ICogYXMgVG9vbHMgZnJvbSAnLi4vbWF0Y2gvdG9vbHMnO1xuXG5jb25zdCB0b29scyA9IFRvb2xzLmdldFRvb2xzKCk7XG5jb25zdCBJbnB1dEZpbHRlclJ1bGVzID0gcmVxdWlyZSgnLi4vbWF0Y2gvaW5wdXRGaWx0ZXJSdWxlcy5qcycpO1xuY29uc3QgbVJ1bGVzID0gSW5wdXRGaWx0ZXJSdWxlcy5nZXRNUnVsZXNTYW1wbGUoKTtcblxuXG5cbmNsYXNzIFNpbXBsZVJlY29nbml6ZXIgaW1wbGVtZW50cyBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG5cbiAgfVxuXG4gIHJlY29nbml6ZShjb250ZXh0OiBidWlsZGVyLklSZWNvZ25pemVDb250ZXh0LCBjYWxsYmFjazogKGVycjogRXJyb3IsIHJlc3VsdDogYnVpbGRlci5JSW50ZW50UmVjb2duaXplclJlc3VsdCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHZhciB1ID0ge30gYXMgYnVpbGRlci5JSW50ZW50UmVjb2duaXplclJlc3VsdDtcblxuICAgIGNvbnNvbGUubG9nKFwicmVjb2duaXppbmcgXCIgKyBjb250ZXh0Lm1lc3NhZ2UudGV4dCk7XG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJzdGFydFwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwiU2hvd0VudGl0eVwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInN0YXJ0IFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJ0cmFpblwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwidHJhaW5cIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImxlYXJuXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJsZWFyblwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnR5cGUgPSBcInRyYWluRmFjdFwiO1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwidHJhaW4gXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJoZWxwXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJoZWxwXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwidHJhaW4gXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJleGl0XCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJleGl0XCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcIndyb25nXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJ3cm9uZ1wiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ3JlY29nbml6aW5nIG5vdGhpbmcnKTtcbiAgICB1LmludGVudCA9IFwiTm9uZVwiO1xuICAgIHUuc2NvcmUgPSAwLjE7XG4gICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgIGUxLnNjb3JlID0gMC4xO1xuICAgIHUuZW50aXRpZXMgPSBbXTtcbiAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICB9XG59XG5cblxuY2xhc3MgU2ltcGxlVXBEb3duUmVjb2duaXplciBpbXBsZW1lbnRzIGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcblxuICB9XG5cbiAgcmVjb2duaXplKGNvbnRleHQ6IGJ1aWxkZXIuSVJlY29nbml6ZUNvbnRleHQsIGNhbGxiYWNrOiAoZXJyOiBFcnJvciwgcmVzdWx0OiBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdmFyIHUgPSB7fSBhcyBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0O1xuXG4gICAgY29uc29sZS5sb2coXCJyZWNvZ25pemluZyBcIiArIGNvbnRleHQubWVzc2FnZS50ZXh0KTtcbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImRvd25cIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcImRvd25cIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJzdGFydCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInVwXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJ1cFwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInVwXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ3JlY29nbml6aW5nIG5vdGhpbmcnKTtcbiAgICB1LmludGVudCA9IFwiTm9uZVwiO1xuICAgIHUuc2NvcmUgPSAwLjE7XG4gICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgIGUxLnNjb3JlID0gMC4xO1xuICAgIHUuZW50aXRpZXMgPSBbXTtcbiAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICB9XG59XG5cbmNvbnN0IEFueU9iamVjdCA9IE9iamVjdCBhcyBhbnk7XG4vLyBnbG9iYWxUdW5uZWwuaW5pdGlhbGl6ZSh7XG4vLyAgaG9zdDogJ3Byb3h5LmV4eHhhbXBsZS5jb20nLFxuLy8gIHBvcnQ6IDgwODBcbi8vIH0pXG5cbi8vIENyZWF0ZSBib3QgYW5kIGJpbmQgdG8gY29uc29sZVxuLy8gdmFyIGNvbm5lY3RvciA9IG5ldyBodG1sY29ubmVjdG9yLkhUTUxDb25uZWN0b3IoKVxuXG4vLyBjb25uZWN0b3Iuc2V0QW5zd2VySG9vayhmdW5jdGlvbiAoc0Fuc3dlcikge1xuLy8gIGNvbnNvbGUubG9nKCdHb3QgYW5zd2VyIDogJyArIHNBbnN3ZXIgKyAnXFxuJylcbi8vIH0pXG5cbnZhciBib3Q7XG4vLyBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbi8vICAgY29ubmVjdG9yLnByb2Nlc3NNZXNzYWdlKCdzdGFydCB1bml0IHRlc3QgQUJDICcpXG4vLyB9LCA1MDAwKVxuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cbnZhciBvSlNPTiA9IEpTT04ucGFyc2UoJycgKyBmcy5yZWFkRmlsZVN5bmMoJy4vcmVzb3VyY2VzL21vZGVsL2ludGVudHMuanNvbicpKTtcbnZhciBvUnVsZXMgPSBQbGFpblJlY29nbml6ZXIucGFyc2VSdWxlcyhvSlNPTik7XG4vLyB2YXIgUmVjb2duaXplciA9IG5ldyAocmVjb2duaXplci5SZWdFeHBSZWNvZ25pemVyKShvUnVsZXMpO1xuXG5cbmZ1bmN0aW9uIGxvZ1F1ZXJ5KHNlc3Npb24gOiBidWlsZGVyLlNlc3Npb24sIGludGVudCA6IHN0cmluZywgcmVzdWx0PyA6IEFycmF5PElNYXRjaC5JVG9vbE1hdGNoPikge1xuXG4gIGZzLmFwcGVuZEZpbGUoJy4vbG9ncy9zaG93bWVxdWVyaWVzLnR4dCcsXCJcXG5cIiArIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB0ZXh0IDogc2Vzc2lvbi5tZXNzYWdlLnRleHQsXG4gICAgICAgICAgdGltZXN0YW1wOiBzZXNzaW9uLm1lc3NhZ2UudGltZXN0YW1wLFxuICAgICAgICAgIGludGVudCA6IGludGVudCxcbiAgICAgICAgICByZXMgOiByZXN1bHQgJiYgcmVzdWx0Lmxlbmd0aCAmJiBNYXRjaC5Ub29sTWF0Y2guZHVtcE5pY2UocmVzdWx0WzBdKSB8fCBcIjBcIlxuICAgICAgICB9KSwgZnVuY3Rpb24oZXJyLCByZXMpIHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcImxvZ2dpbmcgZmFpbGVkIFwiICsgZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuXG4vKipcbiAqIENvbnN0cnVjdCBhIGJvdFxuICogQHBhcmFtIGNvbm5lY3RvciB7Q29ubmVjdG9yfSB0aGUgY29ubmVjdG9yIHRvIHVzZVxuICogSFRNTENvbm5lY3RvclxuICogb3IgY29ubmVjdG9yID0gbmV3IGJ1aWxkZXIuQ29uc29sZUNvbm5lY3RvcigpLmxpc3RlbigpXG4gKi9cbmZ1bmN0aW9uIG1ha2VCb3QoY29ubmVjdG9yKSB7XG4gIGJvdCA9IG5ldyBidWlsZGVyLlVuaXZlcnNhbEJvdChjb25uZWN0b3IpO1xuXG5cblxuICAvLyBDcmVhdGUgTFVJUyByZWNvZ25pemVyIHRoYXQgcG9pbnRzIGF0IG91ciBtb2RlbCBhbmQgYWRkIGl0IGFzIHRoZSByb290ICcvJyBkaWFsb2cgZm9yIG91ciBDb3J0YW5hIEJvdC5cbiAgLy8gdmFyIG1vZGVsID0gc2Vuc2l0aXZlLm1vZGVsdXJsO1xuICAvLyB2YXIgbW9kZWwgPSAnaHR0cHM6Ly9hcGkucHJvamVjdG94Zm9yZC5haS9sdWlzL3YyLjAvYXBwcy9jNDEzYjJlZi0zODJjLTQ1YmQtOGZmMC1mNzZkNjBlMmE4MjE/c3Vic2NyaXB0aW9uLWtleT1jMjEzOThiNTk4MGE0Y2UwOWY0NzRiYmZlZTkzYjg5MiZxPSdcbiAgdmFyIHJlY29nbml6ZXIgPSBuZXcgUGxhaW5SZWNvZ25pemVyLlJlZ0V4cFJlY29nbml6ZXIob1J1bGVzKTtcblxuICB2YXIgZGlhbG9nID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFtyZWNvZ25pemVyXSB9KTtcbiAgLy8gZGlhbG9nLm9uQmVnaW4oZnVuY3Rpb24oc2Vzc2lvbixhcmdzKSB7XG4gIC8vIGNvbnNvbGUubG9nKFwiYmVnaW5uaW5nIC4uLlwiKVxuICAvLyBzZXNzaW9uLmRpYWxvZ0RhdGEucmV0cnlQcm9tcHQgPSBhcmdzICYmIGFyZ3MucmV0cnlQcm9tcHQgfHwgXCJJIGFtIHNvcnJ5XCJcbiAgLy8gc2Vzc2lvbi5zZW5kKFwiV2hhdCBkbyB5b3Ugd2FudD9cIilcbiAgLy9cbiAgLy8gfSlcblxuICB2YXIgZGlhbG9nVXBEb3duID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFtuZXcgU2ltcGxlVXBEb3duUmVjb2duaXplcigpXSB9KTtcblxuXG4gIGJvdC5kaWFsb2coJy91cGRvd24nLCBkaWFsb2dVcERvd24pO1xuICBkaWFsb2dVcERvd24ub25CZWdpbihmdW5jdGlvbiAoc2Vzc2lvbikge1xuICAgIHNlc3Npb24uc2VuZChcIkhpIHRoZXJlLCB1cGRvd24gaXMgd2FpdGluZyBmb3IgeW91XCIpO1xuICB9KVxuXG4gIGRpYWxvZ1VwRG93bi5tYXRjaGVzKCdpbnRlbnQudXAnLCBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ3lvdSB3YW50IHRvIGdvIHVwJyk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IHJlc3VsdHMucmVwb25zZTtcbiAgICAgIG5leHQoKTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoeyByZXNwb25zZTogc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyB9KTtcbiAgICB9XG4gIF1cbiAgKTtcblxuICBkaWFsb2dVcERvd24ubWF0Y2hlcygnaW50ZW50LmRvd24nLCBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ3lvdSB3YW50IHRvIGdvIGRvd24hJyk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IC0xOyAvLyByZXN1bHRzLnJlcG9uc2U7XG4gICAgICBuZXh0KCk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgc2Vzc2lvbi5lbmREaWFsb2dXaXRoUmVzdWx0KHtcbiAgICAgICAgcmVzcG9uc2U6IHsgcmVzOiBcImRvd25cIiwgdTogc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyB9XG4gICAgICB9KTtcbiAgICB9XG4gIF1cbiAgKTtcblxuICBib3QuZGlhbG9nKCcvdHJhaW4nLCBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbGdvRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ0RvIHlvdSB3YW50IHRvIHRyYWluIG1lJyk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IHJlc3VsdHMucmVwb25zZTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoeyByZXNwb25zZTogc2Vzc2lvbi5EaWFsb2dEYXRhLmFiYyB9KTtcbiAgICB9XG4gIF0pO1xuXG5cbiAgYm90LmRpYWxvZygnLycsIGRpYWxvZyk7XG5cbiAgZGlhbG9nLm1hdGNoZXMoJ1Nob3dNZScsIFtcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgdmFyIGlzQ29tYmluZWRJbmRleCA9IHt9O1xuICAgICAgdmFyIG9OZXdFbnRpdHk7XG4gICAgICAvLyBleHBlY3RpbmcgZW50aXR5IEExXG4gICAgICBkZWJ1Z2xvZyhcIlNob3cgRW50aXR5XCIpO1xuICAgICAgY29uc29sZS5sb2coJ3JhdzogJyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpLCB1bmRlZmluZWQsIDIpO1xuICAgICAgdmFyIGExID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ0ExJyk7XG4gICAgICAvKlxuICAgICAgICAgICAgdmFyIGNsaWVudCA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdjbGllbnQnKTtcbiAgICAgICAgICAgIHZhciBzeXN0ZW1PYmplY3RJZCA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGNvbWJpbmVkRW50aXRpZXMsICdzeXN0ZW1PYmplY3RJZCcpIHx8XG4gICAgICAgICAgICAgIGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGNvbWJpbmVkRW50aXRpZXMsICdTeXN0ZW1PYmplY3QnKSB8fFxuICAgICAgICAgICAgICBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnYnVpbHRpbi5udW1iZXInKTtcbiAgICAgICAgICAgIHZhciBzeXN0ZW1PYmplY3RDYXRlZ29yeSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdTeXN0ZW1PYmplY3RDYXRlZ29yeScpO1xuXG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuc3lzdGVtID0ge1xuICAgICAgICAgICAgICBzeXN0ZW1JZDogc3lzdGVtSWQsXG4gICAgICAgICAgICAgIGNsaWVudDogY2xpZW50XG4gICAgICAgICAgICB9O1xuICAgICAgKi9cbiAgICAgIC8qXG4gICAgICAgICAgICB2YXIgc1N5c3RlbUlkID0gc3lzdGVtSWQgJiYgc3lzdGVtSWQuZW50aXR5O1xuICAgICAgICAgICAgdmFyIHNDbGllbnQgPSBjbGllbnQgJiYgY2xpZW50LmVudGl0eTtcbiAgICAgICAgICAgIHZhciBzc3lzdGVtT2JqZWN0SWQgPSBzeXN0ZW1PYmplY3RJZCAmJiBzeXN0ZW1PYmplY3RJZC5lbnRpdHk7XG4gICAgICAgICAgICB2YXIgc1N5c3RlbU9iamVjdENhdGVnb3J5ID0gc3lzdGVtT2JqZWN0Q2F0ZWdvcnkgJiYgc3lzdGVtT2JqZWN0Q2F0ZWdvcnkuZW50aXR5O1xuICAgICAgKi9cblxuICAgICAgY29uc3QgcmVzdWx0ID0gQW5hbHl6ZS5hbmFseXplQWxsKGExLmVudGl0eSxcbiAgICAgICAgbVJ1bGVzLCB0b29scyk7XG4gICAgICBsb2dRdWVyeShzZXNzaW9uLCdTaG93TWUnLHJlc3VsdCk7XG4gICAgICAvLyB0ZXN0LmV4cGVjdCgzKVxuICAgICAgLy8gIHRlc3QuZGVlcEVxdWFsKHJlc3VsdC53ZWlnaHQsIDEyMCwgJ2NvcnJlY3Qgd2VpZ2h0Jyk7XG4gICAgICBpZighcmVzdWx0IHx8IHJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfVxuICAgICAgLy8gZGVidWdsb2coJ3Jlc3VsdCA6ICcgKyBKU09OLnN0cmluZ2lmeShyZXN1bHQsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgZGVidWdsb2coJ2Jlc3QgcmVzdWx0IDogJyArIEpTT04uc3RyaW5naWZ5KHJlc3VsdFswXSB8fCB7fSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICBkZWJ1Z2xvZygndG9wIDogJyArIE1hdGNoLlRvb2xNYXRjaC5kdW1wV2VpZ2h0c1RvcChyZXN1bHQsIHsgdG9wOiAzIH0pKTtcblxuXG4gICAgICBpZiAoQW5hbHl6ZS5pc0NvbXBsZXRlKHJlc3VsdFswXSkpIHtcbiAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCA9IHJlc3VsdFswXTtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKCdTaG93aW5nIGVudGl0eSAuLi4nKTtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSBlbHNlIGlmIChBbmFseXplLmdldFByb21wdChyZXN1bHRbMF0pKSB7XG4gICAgICAgIHZhciBwcm9tcHQgPSBBbmFseXplLmdldFByb21wdChyZXN1bHRbMF0pO1xuICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0ID0gcmVzdWx0WzBdO1xuICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEucHJvbXB0ID0gcHJvbXB0O1xuICAgICAgICBzZXNzaW9uLnNlbmQoXCJOb3QgZW5vdWdoIGluZm9ybWF0aW9uIHN1cHBsaWVkOiBcIiArIE1hdGNoLlRvb2xNYXRjaC5kdW1wTmljZShcbiAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0XG4gICAgICAgICkpO1xuICAgICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCBwcm9tcHQudGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYmVzdCA9IHJlc3VsdC5sZW5ndGggPyBNYXRjaC5Ub29sTWF0Y2guZHVtcE5pY2UocmVzdWx0WzBdKSA6IFwiPG5vdGhpbmc+XCI7XG4gICAgICAgIHNlc3Npb24uc2VuZCgnSSBkaWQgbm90IHVuZGVyc3RhbmQgdGhpcycgKyBiZXN0KTtcbiAgICAgIH1cblxuICAgICAgLypcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTaG93IGVudGl0aWVzOiAnICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcywgdW5kZWZpbmVkLCAyKSk7XG5cbiAgICAgICAgICAgIC8vIGRvIHRoZSBiaWcgYW5hbHlpcyAuLi5cbiAgICAgICAgICAgICAgICAgIHZhciB1ID0gZGlzcGF0Y2hlci5leGVjU2hvd0VudGl0eSh7XG4gICAgICAgICAgICAgIHN5c3RlbUlkOiBzU3lzdGVtSWQsXG4gICAgICAgICAgICAgIGNsaWVudDogc0NsaWVudCxcbiAgICAgICAgICAgICAgdG9vbDogc1Rvb2wsXG4gICAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiBzU3lzdGVtT2JqZWN0Q2F0ZWdvcnksXG4gICAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBzc3lzdGVtT2JqZWN0SWRcbiAgICAgICAgICAgIH0pXG4gICAgICAqL1xuXG4gICAgICAvLyAgc2Vzc2lvbi5zZW5kKCdTaG93aW5nIGVudGl0eSAuLi4nKTtcblxuICAgICAgLy8gIGNvbnNvbGUubG9nKFwic2hvdyBlbnRpdHksIFNob3cgc2Vzc2lvbiA6IFwiICsgSlNPTi5zdHJpbmdpZnkoc2Vzc2lvbikpXG4gICAgICAvLyBjb25zb2xlLmxvZyhcIlNob3cgZW50aXR5IDogXCIgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzKSlcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICB2YXIgcmVzdWx0ID0gc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdDtcbiAgICAgIGlmKCFyZXN1bHQgfHwgcmVzdWx0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXN1bHRzLnJlc3BvbnNlKSB7XG4gICAgICAgIC8vIHNvbWUgcHJvbXB0aW5nXG4gICAgICAgIEFuYWx5emUuc2V0UHJvbXB0KHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQsIHNlc3Npb24uZGlhbG9nRGF0YS5wcm9tcHQsIHJlc3VsdHMucmVzcG9uc2UpO1xuICAgICAgfVxuICAgICAgaWYgKEFuYWx5emUuaXNDb21wbGV0ZShzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0KSkge1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9IGVsc2UgaWYgKEFuYWx5emUuZ2V0UHJvbXB0KHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpKSB7XG4gICAgICAgIHZhciBwcm9tcHQgPSBBbmFseXplLmdldFByb21wdChzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0KTtcbiAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnByb21wdCA9IHByb21wdDtcbiAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgcHJvbXB0LnRleHQpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgIHZhciByZXN1bHQgPSBzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0O1xuICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgLy8gc29tZSBwcm9tcHRpbmdcbiAgICAgICAgQW5hbHl6ZS5zZXRQcm9tcHQoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCxcbiAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEucHJvbXB0LCByZXN1bHRzLnJlc3BvbnNlKTtcbiAgICAgIH1cbiAgICAgIGlmIChBbmFseXplLmlzQ29tcGxldGUoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCkpIHtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKFwic3RhcnRpbmcgID4gXCIgKyBFeGVjLmV4ZWNUb29sKHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0KSB7XG4gICAgICAgICAgc2Vzc2lvbi5zZW5kKFwiTm90IGVub3VnaCBpbmZvcm1hdGlvbiBzdXBwbGllZDogXCIgKyBNYXRjaC5Ub29sTWF0Y2guZHVtcE5pY2UoXG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0XG4gICAgICAgICAgKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2Vzc2lvbi5zZW5kKFwiSSBkaWQgbm90IGdldCB3aGF0IHlvdSB3YW50XCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgXSk7XG5cbiAgZGlhbG9nLm1hdGNoZXMoJ1dyb25nJywgW1xuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICBzZXNzaW9uLmJlZ2luRGlhbG9nKCcvdXBkb3duJywgc2Vzc2lvbi51c2VyRGF0YS5jb3VudCk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgc2Vzc2lvbi5zZW5kKFwiYmFjayBmcm9tIHdyb25nIDogXCIgKyBKU09OLnN0cmluZ2lmeShyZXN1bHRzKSk7XG4gICAgICBuZXh0KCk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgc2Vzc2lvbi5zZW5kKCdlbmQgb2Ygd3JvbmcnKTtcbiAgICB9XG4gIF0pO1xuXG4gIGRpYWxvZy5tYXRjaGVzKCdFeGl0JywgW1xuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICBjb25zb2xlLmxvZygnZXhpdCA6Jyk7XG4gICAgICBjb25zb2xlLmxvZygnZXhpdCcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzKSk7XG4gICAgICBzZXNzaW9uLnNlbmQoXCJ5b3UgYXJlIGluIGEgbG9naWMgbG9vcCBcIik7XG4gICAgfVxuICBdKTtcbiAgZGlhbG9nLm1hdGNoZXMoJ0hlbHAnLCBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdoZWxwIDonKTtcbiAgICAgIGNvbnNvbGUubG9nKCdoZWxwJyk7XG4gICAgICBzZXNzaW9uLnNlbmQoXCJJIGtub3cgYWJvdXQgLi4uLiA8Y2F0ZWdvcmllcz4+XCIpO1xuICAgIH1cbiAgXSk7XG5cblxuXG4gIC8vIEFkZCBpbnRlbnQgaGFuZGxlcnNcbiAgZGlhbG9nLm1hdGNoZXMoJ3RyYWluJywgW1xuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICBjb25zb2xlLmxvZygndHJhaW4nKTtcbiAgICAgIC8vIFJlc29sdmUgYW5kIHN0b3JlIGFueSBlbnRpdGllcyBwYXNzZWQgZnJvbSBMVUlTLlxuICAgICAgdmFyIHRpdGxlID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ2J1aWx0aW4uYWxhcm0udGl0bGUnKTtcbiAgICAgIHZhciB0aW1lID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLnJlc29sdmVUaW1lKGFyZ3MuZW50aXRpZXMpO1xuICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtID0ge1xuICAgICAgICB0aXRsZTogdGl0bGUgPyB0aXRsZS5lbnRpdHkgOiBudWxsLFxuICAgICAgICB0aW1lc3RhbXA6IHRpbWUgPyB0aW1lLmdldFRpbWUoKSA6IG51bGxcbiAgICAgIH07XG4gICAgICAvLyBQcm9tcHQgZm9yIHRpdGxlXG4gICAgICBpZiAoIWFsYXJtLnRpdGxlKSB7XG4gICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdXaGF0IGZhY3Qgd291bGQgeW91IGxpa2UgdG8gdHJhaW4/Jyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgYWxhcm0udGl0bGUgPSByZXN1bHRzLnJlc3BvbnNlO1xuICAgICAgfVxuXG4gICAgICAvLyBQcm9tcHQgZm9yIHRpbWUgKHRpdGxlIHdpbGwgYmUgYmxhbmsgaWYgdGhlIHVzZXIgc2FpZCBjYW5jZWwpXG4gICAgICBpZiAoYWxhcm0udGl0bGUgJiYgIWFsYXJtLnRpbWVzdGFtcCkge1xuICAgICAgICBidWlsZGVyLlByb21wdHMudGltZShzZXNzaW9uLCAnV2hhdCB0aW1lIHdvdWxkIHlvdSBsaWtlIHRvIHNldCB0aGUgYWxhcm0gZm9yPycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICAgIGlmIChyZXN1bHRzLnJlc3BvbnNlKSB7XG4gICAgICAgIHZhciB0aW1lID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLnJlc29sdmVUaW1lKFtyZXN1bHRzLnJlc3BvbnNlXSk7XG4gICAgICAgIGFsYXJtLnRpbWVzdGFtcCA9IHRpbWUgPyB0aW1lLmdldFRpbWUoKSA6IG51bGw7XG4gICAgICB9XG4gICAgICAvLyBTZXQgdGhlIGFsYXJtIChpZiB0aXRsZSBvciB0aW1lc3RhbXAgaXMgYmxhbmsgdGhlIHVzZXIgc2FpZCBjYW5jZWwpXG4gICAgICBpZiAoYWxhcm0udGl0bGUgJiYgYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgIC8vIFNhdmUgYWRkcmVzcyBvZiB3aG8gdG8gbm90aWZ5IGFuZCB3cml0ZSB0byBzY2hlZHVsZXIuXG4gICAgICAgIGFsYXJtLmFkZHJlc3MgPSBzZXNzaW9uLm1lc3NhZ2UuYWRkcmVzcztcbiAgICAgICAgLy9hbGFybXNbYWxhcm0udGl0bGVdID0gYWxhcm07XG5cbiAgICAgICAgLy8gU2VuZCBjb25maXJtYXRpb24gdG8gdXNlclxuICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKGFsYXJtLnRpbWVzdGFtcCk7XG4gICAgICAgIHZhciBpc0FNID0gZGF0ZS5nZXRIb3VycygpIDwgMTI7XG4gICAgICAgIHNlc3Npb24uc2VuZCgnQ3JlYXRpbmcgYWxhcm0gbmFtZWQgXCIlc1wiIGZvciAlZC8lZC8lZCAlZDolMDJkJXMnLFxuICAgICAgICAgIGFsYXJtLnRpdGxlLFxuICAgICAgICAgIGRhdGUuZ2V0TW9udGgoKSArIDEsIGRhdGUuZ2V0RGF0ZSgpLCBkYXRlLmdldEZ1bGxZZWFyKCksXG4gICAgICAgICAgaXNBTSA/IGRhdGUuZ2V0SG91cnMoKSA6IGRhdGUuZ2V0SG91cnMoKSAtIDEyLCBkYXRlLmdldE1pbnV0ZXMoKSwgaXNBTSA/ICdhbScgOiAncG0nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlc3Npb24uc2VuZCgnT2suLi4gbm8gcHJvYmxlbS4nKTtcbiAgICAgIH1cbiAgICB9XG4gIF0pO1xuXG4gIGRpYWxvZy5vbkRlZmF1bHQoZnVuY3Rpb24oc2Vzc2lvbikge1xuICAgIGxvZ1F1ZXJ5KHNlc3Npb24sIFwib25EZWZhdWx0XCIpO1xuICAgIHNlc3Npb24uc2VuZChcIkkgZG8gbm90IHVuZGVyc3RhbmQgdGhpcyBhdCBhbGxcIik7XG4gICAgLy9idWlsZGVyLkRpYWxvZ0FjdGlvbi5zZW5kKCdJXFwnbSBzb3JyeSBJIGRpZG5cXCd0IHVuZGVyc3RhbmQuIEkgY2FuIG9ubHkgc2hvdyBzdGFydCBhbmQgcmluZycpO1xuICB9KTtcblxuICAvKlxuICAvLyBWZXJ5IHNpbXBsZSBhbGFybSBzY2hlZHVsZXJcbiAgdmFyIGFsYXJtcyA9IHt9O1xuICBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIGZvciAodmFyIGtleSBpbiBhbGFybXMpIHtcbiAgICAgIHZhciBhbGFybSA9IGFsYXJtc1trZXldO1xuICAgICAgaWYgKG5vdyA+PSBhbGFybS50aW1lc3RhbXApIHtcbiAgICAgICAgdmFyIG1zZyA9IG5ldyBidWlsZGVyLk1lc3NhZ2UoKVxuICAgICAgICAgIC5hZGRyZXNzKGFsYXJtLmFkZHJlc3MpXG4gICAgICAgICAgLnRleHQoJ0hlcmVcXCdzIHlvdXIgXFwnJXNcXCcgYWxhcm0uJywgYWxhcm0udGl0bGUpO1xuICAgICAgICBib3Quc2VuZChtc2cpO1xuICAgICAgICBkZWxldGUgYWxhcm1zW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9LCAxNTAwMCk7XG4gICovXG59XG5cbmlmIChtb2R1bGUpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbWFrZUJvdDogbWFrZUJvdFxuICB9O1xufVxuIiwiLyoqXG4gKiBUaGUgYm90IGltcGxlbWVudGF0aW9uXG4gKlxuICogSW5zdGFudGlhdGUgYXBzc2luZyBhIGNvbm5lY3RvciB2aWFcbiAqIG1ha2VCb3RcbiAqXG4gKi9cbi8qKlxuICogQGZpbGVcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LnNtYXJ0ZGlhbG9nXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIGJ1aWxkZXIgPSByZXF1aXJlKCdib3RidWlsZGVyJyk7XG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xudmFyIEV4ZWMgPSByZXF1aXJlKCcuLi9leGVjL2V4ZWMnKTtcbnZhciBNYXRjaCA9IHJlcXVpcmUoJy4uL21hdGNoL21hdGNoJyk7XG52YXIgQW5hbHl6ZSA9IHJlcXVpcmUoJy4uL21hdGNoL2FuYWx5emUnKTtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdzbWFydGRpYWxvZycpO1xudmFyIFBsYWluUmVjb2duaXplciA9IHJlcXVpcmUoJy4vcGxhaW5yZWNvZ25pemVyJyk7XG4vL3ZhciBidWlsZGVyID0gcmVxdWlyZSgnYm90YnVpbGRlcicpO1xudmFyIGRpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9tYXRjaC9kaXNwYXRjaGVyLmpzJykuZGlzcGF0Y2hlcjtcbnZhciBUb29scyA9IHJlcXVpcmUoJy4uL21hdGNoL3Rvb2xzJyk7XG52YXIgdG9vbHMgPSBUb29scy5nZXRUb29scygpO1xudmFyIElucHV0RmlsdGVyUnVsZXMgPSByZXF1aXJlKCcuLi9tYXRjaC9pbnB1dEZpbHRlclJ1bGVzLmpzJyk7XG52YXIgbVJ1bGVzID0gSW5wdXRGaWx0ZXJSdWxlcy5nZXRNUnVsZXNTYW1wbGUoKTtcbnZhciBTaW1wbGVSZWNvZ25pemVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTaW1wbGVSZWNvZ25pemVyKCkge1xuICAgIH1cbiAgICBTaW1wbGVSZWNvZ25pemVyLnByb3RvdHlwZS5yZWNvZ25pemUgPSBmdW5jdGlvbiAoY29udGV4dCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHUgPSB7fTtcbiAgICAgICAgY29uc29sZS5sb2coXCJyZWNvZ25pemluZyBcIiArIGNvbnRleHQubWVzc2FnZS50ZXh0KTtcbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJzdGFydFwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwiU2hvd0VudGl0eVwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwic3RhcnQgXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInRyYWluXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJ0cmFpblwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwidHJhaW4gXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImxlYXJuXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJsZWFyblwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEudHlwZSA9IFwidHJhaW5GYWN0XCI7XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiaGVscFwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwiaGVscFwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwidHJhaW4gXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImV4aXRcIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcImV4aXRcIjtcbiAgICAgICAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcIndyb25nXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJ3cm9uZ1wiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdyZWNvZ25pemluZyBub3RoaW5nJyk7XG4gICAgICAgIHUuaW50ZW50ID0gXCJOb25lXCI7XG4gICAgICAgIHUuc2NvcmUgPSAwLjE7XG4gICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgIGUxLnNjb3JlID0gMC4xO1xuICAgICAgICB1LmVudGl0aWVzID0gW107XG4gICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgfTtcbiAgICByZXR1cm4gU2ltcGxlUmVjb2duaXplcjtcbn0oKSk7XG52YXIgU2ltcGxlVXBEb3duUmVjb2duaXplciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2ltcGxlVXBEb3duUmVjb2duaXplcigpIHtcbiAgICB9XG4gICAgU2ltcGxlVXBEb3duUmVjb2duaXplci5wcm90b3R5cGUucmVjb2duaXplID0gZnVuY3Rpb24gKGNvbnRleHQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciB1ID0ge307XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVjb2duaXppbmcgXCIgKyBjb250ZXh0Lm1lc3NhZ2UudGV4dCk7XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiZG93blwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwiZG93blwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwic3RhcnQgXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInVwXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJ1cFwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwidXBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdyZWNvZ25pemluZyBub3RoaW5nJyk7XG4gICAgICAgIHUuaW50ZW50ID0gXCJOb25lXCI7XG4gICAgICAgIHUuc2NvcmUgPSAwLjE7XG4gICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgIGUxLnNjb3JlID0gMC4xO1xuICAgICAgICB1LmVudGl0aWVzID0gW107XG4gICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgfTtcbiAgICByZXR1cm4gU2ltcGxlVXBEb3duUmVjb2duaXplcjtcbn0oKSk7XG52YXIgQW55T2JqZWN0ID0gT2JqZWN0O1xuLy8gZ2xvYmFsVHVubmVsLmluaXRpYWxpemUoe1xuLy8gIGhvc3Q6ICdwcm94eS5leHh4YW1wbGUuY29tJyxcbi8vICBwb3J0OiA4MDgwXG4vLyB9KVxuLy8gQ3JlYXRlIGJvdCBhbmQgYmluZCB0byBjb25zb2xlXG4vLyB2YXIgY29ubmVjdG9yID0gbmV3IGh0bWxjb25uZWN0b3IuSFRNTENvbm5lY3RvcigpXG4vLyBjb25uZWN0b3Iuc2V0QW5zd2VySG9vayhmdW5jdGlvbiAoc0Fuc3dlcikge1xuLy8gIGNvbnNvbGUubG9nKCdHb3QgYW5zd2VyIDogJyArIHNBbnN3ZXIgKyAnXFxuJylcbi8vIH0pXG52YXIgYm90O1xuLy8gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4vLyAgIGNvbm5lY3Rvci5wcm9jZXNzTWVzc2FnZSgnc3RhcnQgdW5pdCB0ZXN0IEFCQyAnKVxuLy8gfSwgNTAwMClcbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG52YXIgb0pTT04gPSBKU09OLnBhcnNlKCcnICsgZnMucmVhZEZpbGVTeW5jKCcuL3Jlc291cmNlcy9tb2RlbC9pbnRlbnRzLmpzb24nKSk7XG52YXIgb1J1bGVzID0gUGxhaW5SZWNvZ25pemVyLnBhcnNlUnVsZXMob0pTT04pO1xuLy8gdmFyIFJlY29nbml6ZXIgPSBuZXcgKHJlY29nbml6ZXIuUmVnRXhwUmVjb2duaXplcikob1J1bGVzKTtcbmZ1bmN0aW9uIGxvZ1F1ZXJ5KHNlc3Npb24sIGludGVudCwgcmVzdWx0KSB7XG4gICAgZnMuYXBwZW5kRmlsZSgnLi9sb2dzL3Nob3dtZXF1ZXJpZXMudHh0JywgXCJcXG5cIiArIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgdGV4dDogc2Vzc2lvbi5tZXNzYWdlLnRleHQsXG4gICAgICAgIHRpbWVzdGFtcDogc2Vzc2lvbi5tZXNzYWdlLnRpbWVzdGFtcCxcbiAgICAgICAgaW50ZW50OiBpbnRlbnQsXG4gICAgICAgIHJlczogcmVzdWx0ICYmIHJlc3VsdC5sZW5ndGggJiYgTWF0Y2guVG9vbE1hdGNoLmR1bXBOaWNlKHJlc3VsdFswXSkgfHwgXCIwXCJcbiAgICB9KSwgZnVuY3Rpb24gKGVyciwgcmVzKSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKFwibG9nZ2luZyBmYWlsZWQgXCIgKyBlcnIpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG4vKipcbiAqIENvbnN0cnVjdCBhIGJvdFxuICogQHBhcmFtIGNvbm5lY3RvciB7Q29ubmVjdG9yfSB0aGUgY29ubmVjdG9yIHRvIHVzZVxuICogSFRNTENvbm5lY3RvclxuICogb3IgY29ubmVjdG9yID0gbmV3IGJ1aWxkZXIuQ29uc29sZUNvbm5lY3RvcigpLmxpc3RlbigpXG4gKi9cbmZ1bmN0aW9uIG1ha2VCb3QoY29ubmVjdG9yKSB7XG4gICAgYm90ID0gbmV3IGJ1aWxkZXIuVW5pdmVyc2FsQm90KGNvbm5lY3Rvcik7XG4gICAgLy8gQ3JlYXRlIExVSVMgcmVjb2duaXplciB0aGF0IHBvaW50cyBhdCBvdXIgbW9kZWwgYW5kIGFkZCBpdCBhcyB0aGUgcm9vdCAnLycgZGlhbG9nIGZvciBvdXIgQ29ydGFuYSBCb3QuXG4gICAgLy8gdmFyIG1vZGVsID0gc2Vuc2l0aXZlLm1vZGVsdXJsO1xuICAgIC8vIHZhciBtb2RlbCA9ICdodHRwczovL2FwaS5wcm9qZWN0b3hmb3JkLmFpL2x1aXMvdjIuMC9hcHBzL2M0MTNiMmVmLTM4MmMtNDViZC04ZmYwLWY3NmQ2MGUyYTgyMT9zdWJzY3JpcHRpb24ta2V5PWMyMTM5OGI1OTgwYTRjZTA5ZjQ3NGJiZmVlOTNiODkyJnE9J1xuICAgIHZhciByZWNvZ25pemVyID0gbmV3IFBsYWluUmVjb2duaXplci5SZWdFeHBSZWNvZ25pemVyKG9SdWxlcyk7XG4gICAgdmFyIGRpYWxvZyA9IG5ldyBidWlsZGVyLkludGVudERpYWxvZyh7IHJlY29nbml6ZXJzOiBbcmVjb2duaXplcl0gfSk7XG4gICAgLy8gZGlhbG9nLm9uQmVnaW4oZnVuY3Rpb24oc2Vzc2lvbixhcmdzKSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJiZWdpbm5pbmcgLi4uXCIpXG4gICAgLy8gc2Vzc2lvbi5kaWFsb2dEYXRhLnJldHJ5UHJvbXB0ID0gYXJncyAmJiBhcmdzLnJldHJ5UHJvbXB0IHx8IFwiSSBhbSBzb3JyeVwiXG4gICAgLy8gc2Vzc2lvbi5zZW5kKFwiV2hhdCBkbyB5b3Ugd2FudD9cIilcbiAgICAvL1xuICAgIC8vIH0pXG4gICAgdmFyIGRpYWxvZ1VwRG93biA9IG5ldyBidWlsZGVyLkludGVudERpYWxvZyh7IHJlY29nbml6ZXJzOiBbbmV3IFNpbXBsZVVwRG93blJlY29nbml6ZXIoKV0gfSk7XG4gICAgYm90LmRpYWxvZygnL3VwZG93bicsIGRpYWxvZ1VwRG93bik7XG4gICAgZGlhbG9nVXBEb3duLm9uQmVnaW4oZnVuY3Rpb24gKHNlc3Npb24pIHtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKFwiSGkgdGhlcmUsIHVwZG93biBpcyB3YWl0aW5nIGZvciB5b3VcIik7XG4gICAgfSk7XG4gICAgZGlhbG9nVXBEb3duLm1hdGNoZXMoJ2ludGVudC51cCcsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ3lvdSB3YW50IHRvIGdvIHVwJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gcmVzdWx0cy5yZXBvbnNlO1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgICAgICAgc2Vzc2lvbi5lbmREaWFsb2dXaXRoUmVzdWx0KHsgcmVzcG9uc2U6IHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgfSk7XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBkaWFsb2dVcERvd24ubWF0Y2hlcygnaW50ZW50LmRvd24nLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICd5b3Ugd2FudCB0byBnbyBkb3duIScpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IC0xOyAvLyByZXN1bHRzLnJlcG9uc2U7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoe1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlOiB7IHJlczogXCJkb3duXCIsIHU6IHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBib3QuZGlhbG9nKCcvdHJhaW4nLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxnb0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdEbyB5b3Ugd2FudCB0byB0cmFpbiBtZScpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IHJlc3VsdHMucmVwb25zZTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZW5kRGlhbG9nV2l0aFJlc3VsdCh7IHJlc3BvbnNlOiBzZXNzaW9uLkRpYWxvZ0RhdGEuYWJjIH0pO1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgYm90LmRpYWxvZygnLycsIGRpYWxvZyk7XG4gICAgZGlhbG9nLm1hdGNoZXMoJ1Nob3dNZScsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHZhciBpc0NvbWJpbmVkSW5kZXggPSB7fTtcbiAgICAgICAgICAgIHZhciBvTmV3RW50aXR5O1xuICAgICAgICAgICAgLy8gZXhwZWN0aW5nIGVudGl0eSBBMVxuICAgICAgICAgICAgZGVidWdsb2coXCJTaG93IEVudGl0eVwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyYXc6ICcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzKSwgdW5kZWZpbmVkLCAyKTtcbiAgICAgICAgICAgIHZhciBhMSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdBMScpO1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgIHZhciBjbGllbnQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnY2xpZW50Jyk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3lzdGVtT2JqZWN0SWQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnc3lzdGVtT2JqZWN0SWQnKSB8fFxuICAgICAgICAgICAgICAgICAgICBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnU3lzdGVtT2JqZWN0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ2J1aWx0aW4ubnVtYmVyJyk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3lzdGVtT2JqZWN0Q2F0ZWdvcnkgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnU3lzdGVtT2JqZWN0Q2F0ZWdvcnknKTtcbiAgICAgIFxuICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnN5c3RlbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtSWQ6IHN5c3RlbUlkLFxuICAgICAgICAgICAgICAgICAgICBjbGllbnQ6IGNsaWVudFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgdmFyIHNTeXN0ZW1JZCA9IHN5c3RlbUlkICYmIHN5c3RlbUlkLmVudGl0eTtcbiAgICAgICAgICAgICAgICAgIHZhciBzQ2xpZW50ID0gY2xpZW50ICYmIGNsaWVudC5lbnRpdHk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3N5c3RlbU9iamVjdElkID0gc3lzdGVtT2JqZWN0SWQgJiYgc3lzdGVtT2JqZWN0SWQuZW50aXR5O1xuICAgICAgICAgICAgICAgICAgdmFyIHNTeXN0ZW1PYmplY3RDYXRlZ29yeSA9IHN5c3RlbU9iamVjdENhdGVnb3J5ICYmIHN5c3RlbU9iamVjdENhdGVnb3J5LmVudGl0eTtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gQW5hbHl6ZS5hbmFseXplQWxsKGExLmVudGl0eSwgbVJ1bGVzLCB0b29scyk7XG4gICAgICAgICAgICBsb2dRdWVyeShzZXNzaW9uLCAnU2hvd01lJywgcmVzdWx0KTtcbiAgICAgICAgICAgIC8vIHRlc3QuZXhwZWN0KDMpXG4gICAgICAgICAgICAvLyAgdGVzdC5kZWVwRXF1YWwocmVzdWx0LndlaWdodCwgMTIwLCAnY29ycmVjdCB3ZWlnaHQnKTtcbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8IHJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBkZWJ1Z2xvZygncmVzdWx0IDogJyArIEpTT04uc3RyaW5naWZ5KHJlc3VsdCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnYmVzdCByZXN1bHQgOiAnICsgSlNPTi5zdHJpbmdpZnkocmVzdWx0WzBdIHx8IHt9LCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgIGRlYnVnbG9nKCd0b3AgOiAnICsgTWF0Y2guVG9vbE1hdGNoLmR1bXBXZWlnaHRzVG9wKHJlc3VsdCwgeyB0b3A6IDMgfSkpO1xuICAgICAgICAgICAgaWYgKEFuYWx5emUuaXNDb21wbGV0ZShyZXN1bHRbMF0pKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCA9IHJlc3VsdFswXTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ1Nob3dpbmcgZW50aXR5IC4uLicpO1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKEFuYWx5emUuZ2V0UHJvbXB0KHJlc3VsdFswXSkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvbXB0ID0gQW5hbHl6ZS5nZXRQcm9tcHQocmVzdWx0WzBdKTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0ID0gcmVzdWx0WzBdO1xuICAgICAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5wcm9tcHQgPSBwcm9tcHQ7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKFwiTm90IGVub3VnaCBpbmZvcm1hdGlvbiBzdXBwbGllZDogXCIgKyBNYXRjaC5Ub29sTWF0Y2guZHVtcE5pY2Uoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCkpO1xuICAgICAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sIHByb21wdC50ZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBiZXN0ID0gcmVzdWx0Lmxlbmd0aCA/IE1hdGNoLlRvb2xNYXRjaC5kdW1wTmljZShyZXN1bHRbMF0pIDogXCI8bm90aGluZz5cIjtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ0kgZGlkIG5vdCB1bmRlcnN0YW5kIHRoaXMnICsgYmVzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1Nob3cgZW50aXRpZXM6ICcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgIFxuICAgICAgICAgICAgICAgICAgLy8gZG8gdGhlIGJpZyBhbmFseWlzIC4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHUgPSBkaXNwYXRjaGVyLmV4ZWNTaG93RW50aXR5KHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtSWQ6IHNTeXN0ZW1JZCxcbiAgICAgICAgICAgICAgICAgICAgY2xpZW50OiBzQ2xpZW50LFxuICAgICAgICAgICAgICAgICAgICB0b29sOiBzVG9vbCxcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6IHNTeXN0ZW1PYmplY3RDYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IHNzeXN0ZW1PYmplY3RJZFxuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvLyAgc2Vzc2lvbi5zZW5kKCdTaG93aW5nIGVudGl0eSAuLi4nKTtcbiAgICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhcInNob3cgZW50aXR5LCBTaG93IHNlc3Npb24gOiBcIiArIEpTT04uc3RyaW5naWZ5KHNlc3Npb24pKVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJTaG93IGVudGl0eSA6IFwiICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcykpXG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdDtcbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8IHJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzdWx0cy5yZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIC8vIHNvbWUgcHJvbXB0aW5nXG4gICAgICAgICAgICAgICAgQW5hbHl6ZS5zZXRQcm9tcHQoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCwgc2Vzc2lvbi5kaWFsb2dEYXRhLnByb21wdCwgcmVzdWx0cy5yZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoQW5hbHl6ZS5pc0NvbXBsZXRlKHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoQW5hbHl6ZS5nZXRQcm9tcHQoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvbXB0ID0gQW5hbHl6ZS5nZXRQcm9tcHQoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnByb21wdCA9IHByb21wdDtcbiAgICAgICAgICAgICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCBwcm9tcHQudGV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdDtcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLnJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgLy8gc29tZSBwcm9tcHRpbmdcbiAgICAgICAgICAgICAgICBBbmFseXplLnNldFByb21wdChzZXNzaW9uLmRpYWxvZ0RhdGEucmVzdWx0LCBzZXNzaW9uLmRpYWxvZ0RhdGEucHJvbXB0LCByZXN1bHRzLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChBbmFseXplLmlzQ29tcGxldGUoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoXCJzdGFydGluZyAgPiBcIiArIEV4ZWMuZXhlY1Rvb2woc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlc3Npb24uZGlhbG9nRGF0YS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKFwiTm90IGVub3VnaCBpbmZvcm1hdGlvbiBzdXBwbGllZDogXCIgKyBNYXRjaC5Ub29sTWF0Y2guZHVtcE5pY2Uoc2Vzc2lvbi5kaWFsb2dEYXRhLnJlc3VsdCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKFwiSSBkaWQgbm90IGdldCB3aGF0IHlvdSB3YW50XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICBdKTtcbiAgICBkaWFsb2cubWF0Y2hlcygnV3JvbmcnLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmJlZ2luRGlhbG9nKCcvdXBkb3duJywgc2Vzc2lvbi51c2VyRGF0YS5jb3VudCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm07XG4gICAgICAgICAgICBzZXNzaW9uLnNlbmQoXCJiYWNrIGZyb20gd3JvbmcgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJlc3VsdHMpKTtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHNlc3Npb24uc2VuZCgnZW5kIG9mIHdyb25nJyk7XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBkaWFsb2cubWF0Y2hlcygnRXhpdCcsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdleGl0IDonKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdleGl0JyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpKTtcbiAgICAgICAgICAgIHNlc3Npb24uc2VuZChcInlvdSBhcmUgaW4gYSBsb2dpYyBsb29wIFwiKTtcbiAgICAgICAgfVxuICAgIF0pO1xuICAgIGRpYWxvZy5tYXRjaGVzKCdIZWxwJywgW1xuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2hlbHAgOicpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2hlbHAnKTtcbiAgICAgICAgICAgIHNlc3Npb24uc2VuZChcIkkga25vdyBhYm91dCAuLi4uIDxjYXRlZ29yaWVzPj5cIik7XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICAvLyBBZGQgaW50ZW50IGhhbmRsZXJzXG4gICAgZGlhbG9nLm1hdGNoZXMoJ3RyYWluJywgW1xuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyYWluJyk7XG4gICAgICAgICAgICAvLyBSZXNvbHZlIGFuZCBzdG9yZSBhbnkgZW50aXRpZXMgcGFzc2VkIGZyb20gTFVJUy5cbiAgICAgICAgICAgIHZhciB0aXRsZSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdidWlsdGluLmFsYXJtLnRpdGxlJyk7XG4gICAgICAgICAgICB2YXIgdGltZSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5yZXNvbHZlVGltZShhcmdzLmVudGl0aWVzKTtcbiAgICAgICAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybSA9IHtcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUgPyB0aXRsZS5lbnRpdHkgOiBudWxsLFxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogdGltZSA/IHRpbWUuZ2V0VGltZSgpIDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIFByb21wdCBmb3IgdGl0bGVcbiAgICAgICAgICAgIGlmICghYWxhcm0udGl0bGUpIHtcbiAgICAgICAgICAgICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCAnV2hhdCBmYWN0IHdvdWxkIHlvdSBsaWtlIHRvIHRyYWluPycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhbGFybS50aXRsZSA9IHJlc3VsdHMucmVzcG9uc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBQcm9tcHQgZm9yIHRpbWUgKHRpdGxlIHdpbGwgYmUgYmxhbmsgaWYgdGhlIHVzZXIgc2FpZCBjYW5jZWwpXG4gICAgICAgICAgICBpZiAoYWxhcm0udGl0bGUgJiYgIWFsYXJtLnRpbWVzdGFtcCkge1xuICAgICAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50aW1lKHNlc3Npb24sICdXaGF0IHRpbWUgd291bGQgeW91IGxpa2UgdG8gc2V0IHRoZSBhbGFybSBmb3I/Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICAgICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm07XG4gICAgICAgICAgICBpZiAocmVzdWx0cy5yZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHZhciB0aW1lID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLnJlc29sdmVUaW1lKFtyZXN1bHRzLnJlc3BvbnNlXSk7XG4gICAgICAgICAgICAgICAgYWxhcm0udGltZXN0YW1wID0gdGltZSA/IHRpbWUuZ2V0VGltZSgpIDogbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFNldCB0aGUgYWxhcm0gKGlmIHRpdGxlIG9yIHRpbWVzdGFtcCBpcyBibGFuayB0aGUgdXNlciBzYWlkIGNhbmNlbClcbiAgICAgICAgICAgIGlmIChhbGFybS50aXRsZSAmJiBhbGFybS50aW1lc3RhbXApIHtcbiAgICAgICAgICAgICAgICAvLyBTYXZlIGFkZHJlc3Mgb2Ygd2hvIHRvIG5vdGlmeSBhbmQgd3JpdGUgdG8gc2NoZWR1bGVyLlxuICAgICAgICAgICAgICAgIGFsYXJtLmFkZHJlc3MgPSBzZXNzaW9uLm1lc3NhZ2UuYWRkcmVzcztcbiAgICAgICAgICAgICAgICAvL2FsYXJtc1thbGFybS50aXRsZV0gPSBhbGFybTtcbiAgICAgICAgICAgICAgICAvLyBTZW5kIGNvbmZpcm1hdGlvbiB0byB1c2VyXG4gICAgICAgICAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShhbGFybS50aW1lc3RhbXApO1xuICAgICAgICAgICAgICAgIHZhciBpc0FNID0gZGF0ZS5nZXRIb3VycygpIDwgMTI7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdDcmVhdGluZyBhbGFybSBuYW1lZCBcIiVzXCIgZm9yICVkLyVkLyVkICVkOiUwMmQlcycsIGFsYXJtLnRpdGxlLCBkYXRlLmdldE1vbnRoKCkgKyAxLCBkYXRlLmdldERhdGUoKSwgZGF0ZS5nZXRGdWxsWWVhcigpLCBpc0FNID8gZGF0ZS5nZXRIb3VycygpIDogZGF0ZS5nZXRIb3VycygpIC0gMTIsIGRhdGUuZ2V0TWludXRlcygpLCBpc0FNID8gJ2FtJyA6ICdwbScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdPay4uLiBubyBwcm9ibGVtLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgXSk7XG4gICAgZGlhbG9nLm9uRGVmYXVsdChmdW5jdGlvbiAoc2Vzc2lvbikge1xuICAgICAgICBsb2dRdWVyeShzZXNzaW9uLCBcIm9uRGVmYXVsdFwiKTtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKFwiSSBkbyBub3QgdW5kZXJzdGFuZCB0aGlzIGF0IGFsbFwiKTtcbiAgICAgICAgLy9idWlsZGVyLkRpYWxvZ0FjdGlvbi5zZW5kKCdJXFwnbSBzb3JyeSBJIGRpZG5cXCd0IHVuZGVyc3RhbmQuIEkgY2FuIG9ubHkgc2hvdyBzdGFydCBhbmQgcmluZycpO1xuICAgIH0pO1xuICAgIC8qXG4gICAgLy8gVmVyeSBzaW1wbGUgYWxhcm0gc2NoZWR1bGVyXG4gICAgdmFyIGFsYXJtcyA9IHt9O1xuICAgIHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgIGZvciAodmFyIGtleSBpbiBhbGFybXMpIHtcbiAgICAgICAgdmFyIGFsYXJtID0gYWxhcm1zW2tleV07XG4gICAgICAgIGlmIChub3cgPj0gYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgICAgdmFyIG1zZyA9IG5ldyBidWlsZGVyLk1lc3NhZ2UoKVxuICAgICAgICAgICAgLmFkZHJlc3MoYWxhcm0uYWRkcmVzcylcbiAgICAgICAgICAgIC50ZXh0KCdIZXJlXFwncyB5b3VyIFxcJyVzXFwnIGFsYXJtLicsIGFsYXJtLnRpdGxlKTtcbiAgICAgICAgICBib3Quc2VuZChtc2cpO1xuICAgICAgICAgIGRlbGV0ZSBhbGFybXNba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sIDE1MDAwKTtcbiAgICAqL1xufVxuaWYgKG1vZHVsZSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICBtYWtlQm90OiBtYWtlQm90XG4gICAgfTtcbn1cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
