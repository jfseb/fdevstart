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
//declare module 'winston-pg' { };
//delcare module 'winston' {};
"use strict";
var builder = require('botbuilder');
var debug = require('debug');
var Match = require('../match/match');
var Analyze = require('../match/analyze');
var WhatIs = require('../match/whatis');
var ListAll = require('../match/listall');
var DialogLogger = require('../utils/dialoglogger');
var process = require('process');
var dburl = process.env.DATABASE_URL || "";
var pglocalurl = "postgres://joe:abcdef@localhost:5432/abot";
var dburl = process.env.DATABASE_URL || pglocalurl;
var pg = require('pg');
var o = pg;
o.defaults.ssl = true;
var dialogLogger = DialogLogger.logger("smartbot", dburl, pg);
function send(o) { return o; }
;
function dialoglog(intent, session, response) {
    var sResponse;
    var sAction;
    if (typeof response === "string") {
        sAction = "";
        sResponse = response;
    }
    else {
        var aMessage = response;
        var iMessage = aMessage.toMessage();
        sResponse = iMessage.text;
        sAction = (iMessage.entities && iMessage.entities[0]) ? (JSON.stringify(iMessage.entities && iMessage.entities[0])) : "";
    }
    dialogLogger({
        intent: intent,
        session: session,
        response: sResponse,
        action: sAction
    });
    session.send(response);
}
//const pgLogger = new PgLogger({
//  name: 'test-logger',
//  level: 'debug',
//  connString: 'postgres://ubuntu@localhost:5432/circle_test',
//  tableName: 'winston_logs',
//});
//winston.add(winston.transports.File, { filename: 'winston_out.log', timestamp : true });
//  winston.remove(winston.transports.Console);
//winston.add(pgLogger);
/*
const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      color: true,
      timestamp: true,
    }),
    pgLogger,
  ]
});
*/
//pgLogger.initTable(done);
var elizabot = require('../extern/elizabot/elizabot.js');
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
var theDefaultModel = Model.loadModels();
var models = {};
function loadModel(modelPath) {
    modelPath = modelPath || "";
    if (!models[modelPath]) {
        models[modelPath] = Model.loadModels(modelPath);
    }
    return models[modelPath];
}
if (newFlow) {
}
else {
}
function isAnonymous(userid) {
    return userid.indexOf("ano:") === 0;
}
function restrictLoggedOn(session, arr) {
    var userid = session.message.address
        && session.message.address.user
        && session.message.address.user.id || "";
    if (process.env.ABOT_EMAIL_USER && isAnonymous(userid)) {
        if (arr.length < 6) {
            return arr;
        }
        var len = arr.length;
        var res = arr.slice(0, Math.min(Math.max(Math.floor(arr.length / 3), 7), arr.length));
        if (typeof arr[0] === "string") {
            var delta = len - res.length;
            res.push("... and " + delta + " more entries for registered users");
        }
        return res;
    }
    return arr;
}
var SimpleRecognizer = (function () {
    function SimpleRecognizer() {
    }
    SimpleRecognizer.prototype.recognize = function (context, callback) {
        var u = {};
        debuglog("recognizing " + context.message.text);
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
        debuglog('recognizing nothing');
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
var aTrainReplies = ["Thank you for sharing this suggestion with us",
    "Thank for for this valuable information.",
    "Thank for for this interesting fact!",
    "Thats a plethoria of information.",
    "That's a nugget of information.",
    "Lovely, I may consider you input.",
    "Well done, anything more to let me know?",
    "I do appreciate your teaching and my learning experience, or was it the other way round?",
    "Your helpful input has been stored in some dusty corner of the World wide web!",
    "Thank you for my learning experience!",
    "I have incorporated your valuable suggestion in the wisdom of the internet"
];
var aTrainDialog = aTrainReplies;
var aTrainExitHint = [
    "\ntype \"done\" when you are done training me.",
    "",
    "",
    "",
    "\nremember, you are stuck here instructing me, type \"done\" to return.",
    ""];
var aEnterTrain = ["So you think this is wrong? You can offer your advise here.\n Type \"done\" if you are done with instructing me",
    "Feel free to offer me your better solution here.\n",
    "Some say \"The secret to happiness is to lower your expectations to the point they are already met.\", \nt if you could help me to becomde better, instruct me.",
    "Feel free to offer me your better solution here.\n Type \"done\" if you are done with instructing me",
    "Feel free to offer me your better solution here.\n Type \"done\" if you are done with instructing me",
];
var aBackFromTraining = [
    "Puuh, back from training! Now for the easy part ...",
    "Live and don't learn, that's us. Naah, we'll see.",
    "The secret to happiness is to lower your expectations to the point they are already met.",
    "Thanks for having this lecture session, now back to our usual self."
];
var aTrainNoKlingon = [
    "He who master the dark arts of SAP must not dwell in the earthly realms of Start Trek.",
    "SAP is a cloud company, not a space company.",
    "The depth of R/3 are deeper than Deep Space 42.",
    "My brainpower is fully absorbed with mastering other realms.",
    "For the wosap, the sky is the limit. Feel free to check out nasa.gov .",
    "The future is SAP or IBM blue, not space black.",
    "That's left to some musky future."
];
function getRandomResult(arr) {
    return arr[Math.floor(Math.random() * arr.length) % arr.length];
}
var SimpleUpDownRecognizer = (function () {
    function SimpleUpDownRecognizer() {
    }
    SimpleUpDownRecognizer.prototype.recognize = function (context, callback) {
        var u = {};
        debuglog("recognizing " + context.message.text);
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
        if (context.message.text.indexOf("done") >= 0) {
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
        if (context.message.text.indexOf("exit") >= 0) {
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
        if (context.message.text.indexOf("quit") >= 0) {
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
        debuglog('recognizing nothing');
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
exports.SimpleUpDownRecognizer = SimpleUpDownRecognizer;
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
function makeBot(connector, modelPath) {
    var theModel = loadModel(modelPath);
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
        dialoglog("TrainMe", session, send(getRandomResult(aEnterTrain)));
        //session.send("Hi there, updown is waiting for you");
    });
    dialogUpDown.matches('intent.up', [
        function (session, args, next) {
            session.dialogData.abc = args || {};
            builder.Prompts.text(session, 'you want to exit training? type \"done\" again.');
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
        var res = getRandomResult(aTrainDialog) + getRandomResult(aTrainExitHint);
        dialoglog("TrainMe", session, send(res));
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
            debuglog('raw: ' + JSON.stringify(args.entities), undefined, 2);
            var a1 = builder.EntityRecognizer.findEntity(args.entities, 'A1');
            var result = Analyze.analyzeAll(a1.entity, theModel.rules, theModel.tools, gwords);
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
                dialoglog("ShowMe", session, send("Not enough information supplied: " + Match.ToolMatch.dumpNice(session.dialogData.result)));
                builder.Prompts.text(session, prompt.text);
            }
            else {
                var best = result.length ? Match.ToolMatch.dumpNice(result[0]) : "<nothing>";
                dialoglog("ShowMe", session, send('I did not understand this' + best));
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
                dialoglog("ShowMe", session, send(reply));
            }
            else {
                if (session.dialogData.result) {
                    dialoglog("ShowMe", session, send("Not enough information supplied: " + Match.ToolMatch.dumpNice(session.dialogData.result)));
                }
                else {
                    dialoglog("ShowMe", session, send("I did not get what you want"));
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
            var cat = WhatIs.analyzeCategory(category, theModel.rules, message);
            if (!cat) {
                session.send('I don\'t know anything about "' + category + '"');
                // next();
                return;
            }
            debuglog('category identified:' + cat);
            var result = WhatIs.resolveCategory(cat, a1.entity, theModel.rules, theModel.records);
            debuglog('whatis result:' + JSON.stringify(result));
            logQueryWhatIs(session, 'WhatIs', result);
            var indis = WhatIs.isIndiscriminateResult(result);
            if (indis) {
                session.send(indis);
                // next();
                return;
            }
            if (!result || result.length === 0) {
                dialoglog("WhatIs", session, send('I don\'t know anything about "' + cat + " (" + category + ')\" in relation to "' + a1.entity + '"'));
                // next();
                return;
            }
            else {
                // debuglog('result : ' + JSON.stringify(result, undefined, 2));
                debuglog('best result : ' + JSON.stringify(result[0] || {}, undefined, 2));
                debuglog('top : ' + WhatIs.dumpWeightsTop(result, { top: 3 }));
                // TODO cleansed sentence
                dialoglog("WhatIs", session, send('The ' + category + ' of ' + a1.entity + ' is ' + result[0].result + "\n")); //  + JSON.stringify(result[0]));
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
                // do we have a filter ?
                var domain = undefined;
                if (a1 && a1.entity) {
                    domain = ListAll.inferDomain(theModel, a1.entity);
                }
                if (!domain) {
                    var res = restrictLoggedOn(session, theModel.category).join(";\n");
                    if (a1 && a1.entity) {
                        dialoglog("ListAll", session, send("I did not infer a domain restriction from \"" + a1.entity + "\", all my categories are ...\n" + res));
                    }
                    else {
                        dialoglog("ListAll", session, send("my categories are ...\n" + res));
                    }
                    return;
                }
                else {
                    var aRes = Model.getCategoriesForDomain(theModel, domain);
                    var res = restrictLoggedOn(session, aRes).join(";\n");
                    dialoglog("ListAll", session, send("my categories in domain \"" + domain + "\" are ...\n" + res));
                    return;
                }
            }
            if (category === "domains") {
                var res = restrictLoggedOn(session, theModel.domains).join(";\n");
                session.send("my domains are ...\n" + res);
                return;
            }
            if (category === "tools") {
                var res = restrictLoggedOn(session, theModel.tools).map(function (oTool) {
                    return oTool.name;
                }).join(";\n");
                dialoglog("ListAll", session, send("my tools are ...\n" + res));
                return;
            }
            var cat = WhatIs.analyzeCategory(category, theModel.rules, message);
            if (!cat) {
                dialoglog("ListAll", session, send('I don\'t know anything about "' + category + '"'));
                // next();
                return;
            }
            debuglog('category identified:' + cat);
            if (a1 && a1.entity) {
                debuglog('got filter:' + a1.entity);
                var categorySet = Model.getAllRecordCategoriesForTargetCategory(theModel, cat, true);
                var result1 = ListAll.listAllWithContext(cat, a1.entity, theModel.rules, theModel.records, categorySet);
                // TODO classifying the string twice is a terrible waste
                if (!result1.length) {
                    debuglog('going for having');
                    var categorySetFull = Model.getAllRecordCategoriesForTargetCategory(theModel, cat, false);
                    result1 = ListAll.listAllHavingContext(cat, a1.entity, theModel.rules, theModel.records, categorySetFull);
                }
                debuglog('listall result:' + JSON.stringify(result1));
                var joinresults = restrictLoggedOn(session, ListAll.joinResults(result1));
                logQueryWhatIs(session, 'ListAll', result1);
                if (joinresults.length) {
                    dialoglog("ListAll", session, send("the " + category + " for " + a1.entity + " are ...\n" + joinresults.join(";\n")));
                }
                else {
                    dialoglog("ListAll", session, send("i did not find any " + category + " for " + a1.entity + ".\n" + joinresults.join(";\n")));
                }
                return;
            }
            else {
                // no entity, e.g. list all countries
                //
                var categorySetFull = Model.getAllRecordCategoriesForTargetCategory(theModel, cat, false);
                var result = ListAll.listAllHavingContext(cat, cat, theModel.rules, theModel.records, categorySetFull);
                logQueryWhatIs(session, 'ListAll', result);
                if (result.length) {
                    debuglog('listall result:' + JSON.stringify(result));
                    var joinresults = [];
                    debuglog("here is cat>" + cat);
                    if (cat !== "example question") {
                        joinresults = restrictLoggedOn(session, ListAll.joinResults(result));
                    }
                    else {
                        joinresults = ListAll.joinResults(result);
                    }
                    var response = "the " + category + " are ...\n" + joinresults.join(";\n");
                    dialoglog("ListAll", session, send(response));
                    return;
                }
                else {
                    var response = "Found no data having \"" + cat + "\"";
                    dialoglog("ListAll", session, send(response));
                    return;
                }
            }
        }
    ]);
    dialog.matches('TrainMe', [
        function (session, args, next) {
            var isCombinedIndex = {};
            var oNewEntity;
            // expecting entity A1
            var message = session.message.text;
            debuglog("Intent : Train");
            debuglog('raw: ' + JSON.stringify(args.entities), undefined, 2);
            var categoryEntity = builder.EntityRecognizer.findEntity(args.entities, 'categories');
            if (message.toLowerCase().indexOf("kronos") >= 0 || message.toLowerCase().indexOf("klingon") >= 0) {
                dialoglog("TrainMe", session, send(getRandomResult(aTrainNoKlingon)));
                return;
            }
            var res = getRandomResult(aTrainReplies);
            dialoglog("TrainMe", session, send(res));
        }
    ]);
    dialog.matches('Wrong', [
        function (session, args, next) {
            dialogLogger({
                session: session,
                intent: "Wrong",
                response: '<begin updown>'
            });
            session.beginDialog('/updown', session.userData.count);
        },
        function (session, results, next) {
            var alarm = session.dialogData.alarm;
            next();
        },
        function (session, results) {
            session.send(getRandomResult(aBackFromTraining)); //  + JSON.stringify(results));
            //session.send('end of wrong');
        }
    ]);
    dialog.matches('Exit', [
        function (session, args, next) {
            debuglog('exit :');
            debuglog('exit' + JSON.stringify(args.entities));
            dialogLogger({
                session: session,
                intent: "Exit",
                response: 'you are in a logic loop'
            });
            session.send("you are in a logic loop ");
        }
    ]);
    dialog.matches('Help', [
        function (session, args, next) {
            debuglog('help :');
            debuglog('help');
            session.send("I know about .... <categories>>");
        }
    ]);
    // Add intent handlers
    dialog.matches('train', [
        function (session, args, next) {
            debuglog('train');
            // Resolve and store any entities passed from LUIS.
            var title = builder.EntityRecognizer.findEntity(args.entities, 'builtin.alarm.title');
            var time = builder.EntityRecognizer.resolveTime(args.entities);
            var alarm = session.dialogData.alarm = {
                title: title ? title.entity : null,
                timestamp: time ? time.getTime() : null
            };
            // Prompt for title
            if (!alarm.title) {
                dialogLogger({
                    session: session,
                    intent: "train",
                    response: 'What fact would you like to train?'
                });
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
        dialoglog("eliza", session, send(reply));
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
        SimpleUpDownRecognizer: SimpleUpDownRecognizer,
        makeBot: makeBot
    };
}

//# sourceMappingURL=smartdialog.js.map
