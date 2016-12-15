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
var WhatIs = require('../match/whatis');
var ListAll = require('../match/listall');
var elizabot = require('../extern/elizabot/elizabot');
//import * as elizabot from 'elizabot';
var debuglog = debug('smartdialog');
var PlainRecognizer = require('./plainrecognizer');
//var builder = require('botbuilder');
var dispatcher = require('../match/dispatcher.js').dispatcher;
function getConversationId(session) {
    return session.message &&
        session.message.address &&
        session.message.address.conversation.id;
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
if (newFlow) {
}
else {
}
var SimpleRecognizer = (function () {
    function SimpleRecognizer() {
    }
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
}());
var SimpleUpDownRecognizer = (function () {
    function SimpleUpDownRecognizer() {
    }
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
}());
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
        conversationId: session.message.address
            && session.message.address.conversation
            && session.message.address.conversation.id || "",
        userid: session.message.address
            && session.message.address.user
            && session.message.address.user.id || ""
    }), function (err, res) {
        if (err) {
            debuglog("logging failed " + err);
        }
    });
}
function logQueryWhatIs(session, intent, result) {
    fs.appendFile('./logs/showmequeries.txt', "\n" + JSON.stringify({
        text: session.message.text,
        timestamp: session.message.timestamp,
        intent: intent,
        res: result && result.length && WhatIs.dumpNice(result[0]) || "0",
        conversationId: session.message.address
            && session.message.address.conversation
            && session.message.address.conversation.id || "",
        userid: session.message.address
            && session.message.address.user
            && session.message.address.user.id || ""
    }), function (err, res) {
        if (err) {
            debuglog("logging failed " + err);
        }
    });
}
var gwords = {};
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
    dialogUpDown.matches('intent.up', [
        function (session, args, next) {
            session.dialogData.abc = args || {};
            builder.Prompts.text(session, 'you want to go up');
        },
        function (session, results, next) {
            session.dialogData.abc = results.reponse;
            next();
        },
        function (session, results) {
            session.endDialogWithResult({ response: session.dialogData.abc });
        }
    ]);
    dialogUpDown.matches('intent.down', [
        function (session, args, next) {
            session.dialogData.abc = args || {};
            builder.Prompts.text(session, 'you want to go down!');
        },
        function (session, results, next) {
            session.dialogData.abc = -1; // results.reponse;
            next();
        },
        function (session, results) {
            session.send("still going down?");
        }
    ]);
    dialogUpDown.onDefault(function (session) {
        logQuery(session, "onDefault");
        session.send("You are trapped in a dialog which only understands up and down, one of them will get you out");
        //builder.DialogAction.send('I\'m sorry I didn\'t understand. I can only show start and ring');
    });
    bot.dialog('/train', [
        function (session, args, next) {
            session.dialgoData.abc = args || {};
            builder.Prompts.text(session, 'Do you want to train me');
        },
        function (session, results, next) {
            session.dialogData.abc = results.reponse;
        },
        function (session, results) {
            session.endDialogWithResult({ response: session.DialogData.abc });
        }
    ]);
    bot.dialog('/', dialog);
    dialog.matches('ShowMe', [
        function (session, args, next) {
            var isCombinedIndex = {};
            var oNewEntity;
            // expecting entity A1
            debuglog("Show Entity");
            console.log('raw: ' + JSON.stringify(args.entities), undefined, 2);
            var a1 = builder.EntityRecognizer.findEntity(args.entities, 'A1');
            var result = Analyze.analyzeAll(a1.entity, theModel.mRules, theModel.tools, gwords);
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
                //    session.send('Showing entity ...');
                next();
            }
            else if (Analyze.getPrompt(result[0])) {
                var prompt = Analyze.getPrompt(result[0]);
                session.dialogData.result = result[0];
                session.dialogData.prompt = prompt;
                session.send("Not enough information supplied: " + Match.ToolMatch.dumpNice(session.dialogData.result));
                builder.Prompts.text(session, prompt.text);
            }
            else {
                var best = result.length ? Match.ToolMatch.dumpNice(result[0]) : "<nothing>";
                //session.send('I did not understand this' + best);
                var reply = new builder.Message(session)
                    .text('I did not understand this' + best)
                    .addEntity({ url: "I don't know" });
                // .addAttachment({ fallbackText: "I don't know", contentType: 'image/jpeg', contentUrl: "www.wombat.org" });
                session.send(reply);
            }
        },
        function (session, results, next) {
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
            }
            else if (Analyze.getPrompt(session.dialogData.result)) {
                var prompt = Analyze.getPrompt(session.dialogData.result);
                session.dialogData.prompt = prompt;
                builder.Prompts.text(session, prompt.text);
            }
        },
        function (session, results, next) {
            var result = session.dialogData.result;
            if (results.response) {
                // some prompting
                Analyze.setPrompt(session.dialogData.result, session.dialogData.prompt, results.response);
            }
            if (Analyze.isComplete(session.dialogData.result)) {
                var exec = ExecServer.execTool(session.dialogData.result, theModel.records);
                var reply = new builder.Message(session)
                    .text(exec.text)
                    .addEntity(exec.action);
                // .addAttachment({ fallbackText: "I don't know", contentType: 'image/jpeg', contentUrl: "www.wombat.org" });
                session.send(reply);
            }
            else {
                if (session.dialogData.result) {
                    session.send("Not enough information supplied: " + Match.ToolMatch.dumpNice(session.dialogData.result));
                }
                else {
                    session.send("I did not get what you want");
                }
            }
        },
    ]);
    dialog.matches('WhatIs', [
        function (session, args, next) {
            var isCombinedIndex = {};
            var oNewEntity;
            // expecting entity A1
            var message = session.message.text;
            debuglog("WhatIs Entities");
            debuglog('raw: ' + JSON.stringify(args.entities), undefined, 2);
            var categoryEntity = builder.EntityRecognizer.findEntity(args.entities, 'category');
            var category = categoryEntity.entity;
            var a1 = builder.EntityRecognizer.findEntity(args.entities, 'A1');
            var cat = WhatIs.analyzeCategory(category, theModel.mRules, message);
            if (!cat) {
                session.send('I don\'t know anything about "' + category + '"');
                // next();
                return;
            }
            debuglog('category identified:' + cat);
            var result = WhatIs.resolveCategory(cat, a1.entity, theModel.mRules, theModel.records);
            debuglog('whatis result:' + JSON.stringify(result));
            logQueryWhatIs(session, 'WhatIs', result);
            var indis = WhatIs.isIndiscriminateResult(result);
            if (indis) {
                session.send(indis);
                // next();
                return;
            }
            if (!result || result.length === 0) {
                session.send('I don\'t know anything about "' + cat + " (" + category + ')\" in relation to "' + a1.entity + '"');
                // next();
                return;
            }
            else {
                // debuglog('result : ' + JSON.stringify(result, undefined, 2));
                debuglog('best result : ' + JSON.stringify(result[0] || {}, undefined, 2));
                debuglog('top : ' + WhatIs.dumpWeightsTop(result, { top: 3 }));
                // TODO cleansed sentence
                session.send('The ' + category + ' of ' + a1.entity + ' is ' + result[0].result + "\n"); //  + JSON.stringify(result[0]));
            }
        }
    ]);
    dialog.matches('ListAll', [
        function (session, args, next) {
            var isCombinedIndex = {};
            var oNewEntity;
            // expecting entity A1
            var message = session.message.text;
            debuglog("Intent : ListAll");
            debuglog('raw: ' + JSON.stringify(args.entities), undefined, 2);
            var categoryEntity = builder.EntityRecognizer.findEntity(args.entities, 'categories');
            var category = categoryEntity.entity;
            var a1 = builder.EntityRecognizer.findEntity(args.entities, 'insth');
            if (category === "categories") {
                var res = theModel.category.join(";\n");
                session.send("my categories are ...\n" + res);
                return;
            }
            if (category === "domains") {
                var res = theModel.domains.join(";\n");
                session.send("my domains are ...\n" + res);
                return;
            }
            if (category === "tools") {
                var res = theModel.tools.map(function (oTool) {
                    return oTool.name;
                }).join(";\n");
                session.send("my tools are ...\n" + res);
                return;
            }
            var cat = WhatIs.analyzeCategory(category, theModel.mRules, message);
            if (!cat) {
                session.send('I don\'t know anything about "' + category + '"');
                // next();
                return;
            }
            debuglog('category identified:' + cat);
            if (a1 && a1.entity) {
                debuglog('got filter:' + a1.entity);
                var result1 = ListAll.listAllWithContext(cat, a1.entity, theModel.mRules, theModel.records);
                // TODO classifying the string twice is a terrible waste
                if (!result1.length) {
                    debuglog('going for having');
                    result1 = ListAll.listAllHavingContext(cat, a1.entity, theModel.mRules, theModel.records);
                }
                debuglog('listall result:' + JSON.stringify(result1));
                var joinresults = ListAll.joinResults(result1);
                logQueryWhatIs(session, 'ListAll', result1);
                session.send("the " + category + " for " + a1.entity + " are ...\n" + joinresults.join(";\n"));
                return;
            }
            else {
                // no entity, e.g. list all countries
                //
                var result = ListAll.listAllHavingContext(cat, cat, theModel.mRules, theModel.records);
                logQueryWhatIs(session, 'ListAll', result);
                if (result.length) {
                    debuglog('listall result:' + JSON.stringify(result));
                    var joinresults = ListAll.joinResults(result);
                    session.send("the " + category + " are ...\n" + joinresults.join(";\n"));
                    return;
                }
                else {
                    session.send("Found no data having \"" + cat + "\"");
                    return;
                }
            }
        }
    ]);
    dialog.matches('Wrong', [
        function (session, args, next) {
            session.beginDialog('/updown', session.userData.count);
        },
        function (session, results, next) {
            var alarm = session.dialogData.alarm;
            session.send("back from wrong : " + JSON.stringify(results));
            next();
        },
        function (session, results) {
            session.send('end of wrong');
        }
    ]);
    dialog.matches('Exit', [
        function (session, args, next) {
            console.log('exit :');
            console.log('exit' + JSON.stringify(args.entities));
            session.send("you are in a logic loop ");
        }
    ]);
    dialog.matches('Help', [
        function (session, args, next) {
            console.log('help :');
            console.log('help');
            session.send("I know about .... <categories>>");
        }
    ]);
    // Add intent handlers
    dialog.matches('train', [
        function (session, args, next) {
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
            }
            else {
                next();
            }
        },
        function (session, results, next) {
            var alarm = session.dialogData.alarm;
            if (results.response) {
                alarm.title = results.response;
            }
            // Prompt for time (title will be blank if the user said cancel)
            if (alarm.title && !alarm.timestamp) {
                builder.Prompts.time(session, 'What time would you like to set the alarm for?');
            }
            else {
                next();
            }
        },
        function (session, results) {
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
            }
            else {
                session.send('Ok... no problem.');
            }
        }
    ]);
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

//# sourceMappingURL=smartdialog.js.map
