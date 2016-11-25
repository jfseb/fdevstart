/**
 * The bot implementation
 *
 * Instantiate apssing a connector via
 * makeBot
 *
 */
"use strict";
// var exec = require('child_process').exec
// var request2 = require('request-defaults')
// var request = request2.globalDefaults({
//  'proxy': 'http://proxy:8080',
//  'https-proxy': 'https://proxy:8080'
// })
var builder = require('botbuilder');
//var builder = require('botbuilder');
var dispatcher = require('../match/dispatcher.js').dispatcher;
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
    var recognizer = new SimpleRecognizer(); // builder.LuisRecognizer(model);
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
            session.endDialogWithResult({
                response: { res: "down", u: session.dialogData.abc } });
        }
    ]);
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
    dialog.matches('ShowEntity', [
        function (session, args, next) {
            var isCombinedIndex = {};
            var oNewEntity;
            // fuse entities
            var combinedEntities = args.entities.map(function (oEntity, iIndex) {
                if (isCombinedIndex[iIndex]) {
                    return undefined;
                }
                var i = iIndex + 1;
                oNewEntity = AnyObject.assign({}, oEntity);
                while (i < args.entities.length) {
                    var oNext = args.entities[i];
                    if (oNext.type === oEntity.type &&
                        (oNext.startIndex === (oNewEntity.endIndex + 1) ||
                            oNext.startIndex === (oNewEntity.endIndex + 2))) {
                        var spaced = oNext.startIndex === (oNewEntity.endIndex + 2);
                        isCombinedIndex[i] = true;
                        oNewEntity.entity = oNewEntity.entity +
                            (spaced ? ' ' : '') +
                            oNext.entity;
                        oNewEntity.endIndex = oNext.endIndex;
                        i = i + 1;
                    }
                    else {
                        i = args.entities.length;
                    }
                } // while
                return oNewEntity;
            });
            console.log("Show Entity");
            combinedEntities = combinedEntities.filter(function (oEntity) { return oEntity !== undefined; });
            console.log('raw: ' + JSON.stringify(args.entities), undefined, 2);
            console.log('combined: ' + JSON.stringify(combinedEntities, undefined, 2));
            /*
                  var systemId = builder.EntityRecognizer.findEntity(combinedEntities, 'SystemId');
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
            console.log('Show entities: ' + JSON.stringify(args.entities, undefined, 2));
            session.send('Showing entity ...');
            //  console.log("show entity, Show session : " + JSON.stringify(session))
            // console.log("Show entity : " + JSON.stringify(args.entities))
        }
    ]);
    dialog.matches('wrong', [
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
    dialog.matches('exit', [
        function (session, args, next) {
            console.log('exit :');
            console.log('exit' + JSON.stringify(args.entities));
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
                alarms[alarm.title] = alarm;
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
    dialog.onDefault(builder.DialogAction.send('I\'m sorry I didn\'t understand. I can only show start and ring'));
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
}
if (module) {
    module.exports = {
        makeBot: makeBot
    };
}

//# sourceMappingURL=dumbdialog.js.map
