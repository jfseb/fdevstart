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
            response: { res: "down", u: session.dialogData.abc } });
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
    dialog.matches('ShowEntity', [function (session, args, next) {
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
                if (oNext.type === oEntity.type && (oNext.startIndex === oNewEntity.endIndex + 1 || oNext.startIndex === oNewEntity.endIndex + 2)) {
                    var spaced = oNext.startIndex === oNewEntity.endIndex + 2;
                    isCombinedIndex[i] = true;
                    oNewEntity.entity = oNewEntity.entity + (spaced ? ' ' : '') + oNext.entity;
                    oNewEntity.endIndex = oNext.endIndex;
                    i = i + 1;
                } else {
                    i = args.entities.length;
                }
            } // while
            return oNewEntity;
        });
        console.log("Show Entity");
        combinedEntities = combinedEntities.filter(function (oEntity) {
            return oEntity !== undefined;
        });
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
    }]);
    dialog.matches('wrong', [function (session, args, next) {
        session.beginDialog('/updown', session.userData.count);
    }, function (session, results, next) {
        var alarm = session.dialogData.alarm;
        session.send("back from wrong : " + JSON.stringify(results));
        next();
    }, function (session, results) {
        session.send('end of wrong');
    }]);
    dialog.matches('exit', [function (session, args, next) {
        console.log('exit :');
        console.log('exit' + JSON.stringify(args.entities));
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
            alarms[alarm.title] = alarm;
            // Send confirmation to user
            var date = new Date(alarm.timestamp);
            var isAM = date.getHours() < 12;
            session.send('Creating alarm named "%s" for %d/%d/%d %d:%02d%s', alarm.title, date.getMonth() + 1, date.getDate(), date.getFullYear(), isAM ? date.getHours() : date.getHours() - 12, date.getMinutes(), isAM ? 'am' : 'pm');
        } else {
            session.send('Ok... no problem.');
        }
    }]);
    dialog.onDefault(builder.DialogAction.send('I\'m sorry I didn\'t understand. I can only show start and ring'));
    // Very simple alarm scheduler
    var alarms = {};
    setInterval(function () {
        var now = new Date().getTime();
        for (var key in alarms) {
            var alarm = alarms[key];
            if (now >= alarm.timestamp) {
                var msg = new builder.Message().address(alarm.address).text('Here\'s your \'%s\' alarm.', alarm.title);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9ib3QvZHVtYmRpYWxvZy50cyIsImJvdC9kdW1iZGlhbG9nLmpzIl0sIm5hbWVzIjpbImJ1aWxkZXIiLCJyZXF1aXJlIiwiZGlzcGF0Y2hlciIsIlNpbXBsZVJlY29nbml6ZXIiLCJwcm90b3R5cGUiLCJyZWNvZ25pemUiLCJjb250ZXh0IiwiY2FsbGJhY2siLCJ1IiwiY29uc29sZSIsImxvZyIsIm1lc3NhZ2UiLCJ0ZXh0IiwiaW5kZXhPZiIsImludGVudCIsInNjb3JlIiwiZTEiLCJzdGFydEluZGV4IiwibGVuZ3RoIiwiZW5kSW5kZXgiLCJlbnRpdGllcyIsInVuZGVmaW5lZCIsInR5cGUiLCJTaW1wbGVVcERvd25SZWNvZ25pemVyIiwiQW55T2JqZWN0IiwiT2JqZWN0IiwiYm90IiwibWFrZUJvdCIsImNvbm5lY3RvciIsIlVuaXZlcnNhbEJvdCIsInJlY29nbml6ZXIiLCJkaWFsb2ciLCJJbnRlbnREaWFsb2ciLCJyZWNvZ25pemVycyIsImRpYWxvZ1VwRG93biIsIm9uQmVnaW4iLCJzZXNzaW9uIiwic2VuZCIsIm1hdGNoZXMiLCJhcmdzIiwibmV4dCIsImRpYWxvZ0RhdGEiLCJhYmMiLCJQcm9tcHRzIiwicmVzdWx0cyIsInJlcG9uc2UiLCJlbmREaWFsb2dXaXRoUmVzdWx0IiwicmVzcG9uc2UiLCJyZXMiLCJkaWFsZ29EYXRhIiwiRGlhbG9nRGF0YSIsImlzQ29tYmluZWRJbmRleCIsIm9OZXdFbnRpdHkiLCJjb21iaW5lZEVudGl0aWVzIiwibWFwIiwib0VudGl0eSIsImlJbmRleCIsImkiLCJhc3NpZ24iLCJvTmV4dCIsInNwYWNlZCIsImVudGl0eSIsImZpbHRlciIsIkpTT04iLCJzdHJpbmdpZnkiLCJiZWdpbkRpYWxvZyIsInVzZXJEYXRhIiwiY291bnQiLCJhbGFybSIsInRpdGxlIiwiRW50aXR5UmVjb2duaXplciIsImZpbmRFbnRpdHkiLCJ0aW1lIiwicmVzb2x2ZVRpbWUiLCJ0aW1lc3RhbXAiLCJnZXRUaW1lIiwiYWRkcmVzcyIsImFsYXJtcyIsImRhdGUiLCJEYXRlIiwiaXNBTSIsImdldEhvdXJzIiwiZ2V0TW9udGgiLCJnZXREYXRlIiwiZ2V0RnVsbFllYXIiLCJnZXRNaW51dGVzIiwib25EZWZhdWx0IiwiRGlhbG9nQWN0aW9uIiwic2V0SW50ZXJ2YWwiLCJub3ciLCJrZXkiLCJtc2ciLCJNZXNzYWdlIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7QUNPQTtBRENBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxJQUFZQSxVQUFPQyxRQUFNLFlBQU4sQ0FBbkI7QUFDQTtBQUVBLElBQUlDLGFBQWFELFFBQVEsd0JBQVIsRUFBa0NDLFVBQW5EO0FBR0EsSUFBQUMsbUJBQUEsWUFBQTtBQUNFLGFBQUFBLGdCQUFBLEdBQUEsQ0FFQztBQUVEQSxxQkFBQUMsU0FBQSxDQUFBQyxTQUFBLEdBQUEsVUFBVUMsT0FBVixFQUE4Q0MsUUFBOUMsRUFBcUg7QUFDbkgsWUFBSUMsSUFBSSxFQUFSO0FBRUFDLGdCQUFRQyxHQUFSLENBQVksaUJBQWlCSixRQUFRSyxPQUFSLENBQWdCQyxJQUE3QztBQUNBLFlBQUlOLFFBQVFLLE9BQVIsQ0FBZ0JDLElBQWhCLENBQXFCQyxPQUFyQixDQUE2QixPQUE3QixLQUF5QyxDQUE3QyxFQUFnRDtBQUM5Q0wsY0FBRU0sTUFBRixHQUFXLFlBQVg7QUFDQU4sY0FBRU8sS0FBRixHQUFVLEdBQVY7QUFDQSxnQkFBSUMsS0FBSyxFQUFUO0FBQ0FBLGVBQUdDLFVBQUgsR0FBZ0IsU0FBU0MsTUFBekI7QUFDQUYsZUFBR0csUUFBSCxHQUFjYixRQUFRSyxPQUFSLENBQWdCQyxJQUFoQixDQUFxQk0sTUFBbkM7QUFDQUYsZUFBR0QsS0FBSCxHQUFXLEdBQVg7QUFDQVAsY0FBRVksUUFBRixHQUFhLENBQUNKLEVBQUQsQ0FBYjtBQUNBVCxxQkFBU2MsU0FBVCxFQUFvQmIsQ0FBcEI7QUFDQTtBQUNEO0FBRUQsWUFBSUYsUUFBUUssT0FBUixDQUFnQkMsSUFBaEIsQ0FBcUJDLE9BQXJCLENBQTZCLE9BQTdCLEtBQXlDLENBQTdDLEVBQWdEO0FBQzlDTCxjQUFFTSxNQUFGLEdBQVcsT0FBWDtBQUNBTixjQUFFTyxLQUFGLEdBQVUsR0FBVjtBQUNBLGdCQUFJQyxLQUFLLEVBQVQ7QUFDQUEsZUFBR0MsVUFBSCxHQUFnQixTQUFTQyxNQUF6QjtBQUNBRixlQUFHRyxRQUFILEdBQWNiLFFBQVFLLE9BQVIsQ0FBZ0JDLElBQWhCLENBQXFCTSxNQUFuQztBQUNBRixlQUFHRCxLQUFILEdBQVcsR0FBWDtBQUNBUCxjQUFFWSxRQUFGLEdBQWEsQ0FBQ0osRUFBRCxDQUFiO0FBQ0FULHFCQUFTYyxTQUFULEVBQW9CYixDQUFwQjtBQUNBO0FBQ0Q7QUFDRCxZQUFJRixRQUFRSyxPQUFSLENBQWdCQyxJQUFoQixDQUFxQkMsT0FBckIsQ0FBNkIsT0FBN0IsS0FBeUMsQ0FBN0MsRUFBZ0Q7QUFDOUNMLGNBQUVNLE1BQUYsR0FBVyxPQUFYO0FBQ0FOLGNBQUVPLEtBQUYsR0FBVSxHQUFWO0FBQ0EsZ0JBQUlDLEtBQUssRUFBVDtBQUNBQSxlQUFHTSxJQUFILEdBQVUsV0FBVjtBQUNBTixlQUFHQyxVQUFILEdBQWdCLFNBQVNDLE1BQXpCO0FBQ0FGLGVBQUdHLFFBQUgsR0FBY2IsUUFBUUssT0FBUixDQUFnQkMsSUFBaEIsQ0FBcUJNLE1BQW5DO0FBQ0FGLGVBQUdELEtBQUgsR0FBVyxHQUFYO0FBQ0FQLGNBQUVZLFFBQUYsR0FBYSxDQUFDSixFQUFELENBQWI7QUFDQVQscUJBQVNjLFNBQVQsRUFBb0JiLENBQXBCO0FBQ0E7QUFDRDtBQUNELFlBQUlGLFFBQVFLLE9BQVIsQ0FBZ0JDLElBQWhCLENBQXFCQyxPQUFyQixDQUE2QixNQUE3QixLQUF3QyxDQUE1QyxFQUErQztBQUM3Q0wsY0FBRU0sTUFBRixHQUFXLE1BQVg7QUFDQU4sY0FBRU8sS0FBRixHQUFVLEdBQVY7QUFDQSxnQkFBSUMsS0FBSyxFQUFUO0FBQ0FBLGVBQUdDLFVBQUgsR0FBZ0IsU0FBU0MsTUFBekI7QUFDQUYsZUFBR0csUUFBSCxHQUFjYixRQUFRSyxPQUFSLENBQWdCQyxJQUFoQixDQUFxQk0sTUFBbkM7QUFDQUYsZUFBR0QsS0FBSCxHQUFXLEdBQVg7QUFDQVAsY0FBRVksUUFBRixHQUFhLENBQUNKLEVBQUQsQ0FBYjtBQUNBVCxxQkFBU2MsU0FBVCxFQUFvQmIsQ0FBcEI7QUFDQTtBQUNEO0FBQ0QsWUFBSUYsUUFBUUssT0FBUixDQUFnQkMsSUFBaEIsQ0FBcUJDLE9BQXJCLENBQTZCLE1BQTdCLEtBQXdDLENBQTVDLEVBQStDO0FBQzdDTCxjQUFFTSxNQUFGLEdBQVcsTUFBWDtBQUNBTixjQUFFTyxLQUFGLEdBQVUsR0FBVjtBQUNBLGdCQUFJQyxLQUFLLEVBQVQ7QUFDQUEsZUFBR0MsVUFBSCxHQUFnQixRQUFRQyxNQUF4QjtBQUNBRixlQUFHRyxRQUFILEdBQWNiLFFBQVFLLE9BQVIsQ0FBZ0JDLElBQWhCLENBQXFCTSxNQUFuQztBQUNBRixlQUFHRCxLQUFILEdBQVcsR0FBWDtBQUNBUCxjQUFFWSxRQUFGLEdBQWEsQ0FBQ0osRUFBRCxDQUFiO0FBQ0FULHFCQUFTYyxTQUFULEVBQW9CYixDQUFwQjtBQUNBO0FBQ0Q7QUFDQSxZQUFJRixRQUFRSyxPQUFSLENBQWdCQyxJQUFoQixDQUFxQkMsT0FBckIsQ0FBNkIsT0FBN0IsS0FBeUMsQ0FBN0MsRUFBZ0Q7QUFDL0NMLGNBQUVNLE1BQUYsR0FBVyxPQUFYO0FBQ0FOLGNBQUVPLEtBQUYsR0FBVSxHQUFWO0FBQ0EsZ0JBQUlDLEtBQUssRUFBVDtBQUNBQSxlQUFHQyxVQUFILEdBQWdCLFFBQVFDLE1BQXhCO0FBQ0FGLGVBQUdHLFFBQUgsR0FBY2IsUUFBUUssT0FBUixDQUFnQkMsSUFBaEIsQ0FBcUJNLE1BQW5DO0FBQ0FGLGVBQUdELEtBQUgsR0FBVyxHQUFYO0FBQ0FQLGNBQUVZLFFBQUYsR0FBYSxDQUFDSixFQUFELENBQWI7QUFDQVQscUJBQVNjLFNBQVQsRUFBb0JiLENBQXBCO0FBQ0E7QUFDRDtBQUNEQyxnQkFBUUMsR0FBUixDQUFZLHFCQUFaO0FBQ0VGLFVBQUVNLE1BQUYsR0FBVyxNQUFYO0FBQ0FOLFVBQUVPLEtBQUYsR0FBVSxHQUFWO0FBQ0EsWUFBSUMsS0FBSyxFQUFUO0FBQ0FBLFdBQUdDLFVBQUgsR0FBZ0IsUUFBUUMsTUFBeEI7QUFDQUYsV0FBR0csUUFBSCxHQUFjYixRQUFRSyxPQUFSLENBQWdCQyxJQUFoQixDQUFxQk0sTUFBbkM7QUFDQUYsV0FBR0QsS0FBSCxHQUFXLEdBQVg7QUFDQVAsVUFBRVksUUFBRixHQUFhLEVBQWI7QUFDQWIsaUJBQVNjLFNBQVQsRUFBb0JiLENBQXBCO0FBQ0gsS0FqRkQ7QUFrRkYsV0FBQUwsZ0JBQUE7QUF2RkEsQ0FBQSxFQUFBO0FBMEZBLElBQUFvQix5QkFBQSxZQUFBO0FBQ0UsYUFBQUEsc0JBQUEsR0FBQSxDQUVDO0FBRURBLDJCQUFBbkIsU0FBQSxDQUFBQyxTQUFBLEdBQUEsVUFBVUMsT0FBVixFQUE4Q0MsUUFBOUMsRUFBcUg7QUFDbkgsWUFBSUMsSUFBSSxFQUFSO0FBRUFDLGdCQUFRQyxHQUFSLENBQVksaUJBQWlCSixRQUFRSyxPQUFSLENBQWdCQyxJQUE3QztBQUNBLFlBQUlOLFFBQVFLLE9BQVIsQ0FBZ0JDLElBQWhCLENBQXFCQyxPQUFyQixDQUE2QixNQUE3QixLQUF3QyxDQUE1QyxFQUErQztBQUM3Q0wsY0FBRU0sTUFBRixHQUFXLE1BQVg7QUFDQU4sY0FBRU8sS0FBRixHQUFVLEdBQVY7QUFDQSxnQkFBSUMsS0FBSyxFQUFUO0FBQ0FBLGVBQUdDLFVBQUgsR0FBZ0IsU0FBU0MsTUFBekI7QUFDQUYsZUFBR0csUUFBSCxHQUFjYixRQUFRSyxPQUFSLENBQWdCQyxJQUFoQixDQUFxQk0sTUFBbkM7QUFDQUYsZUFBR0QsS0FBSCxHQUFXLEdBQVg7QUFDQVAsY0FBRVksUUFBRixHQUFhLENBQUNKLEVBQUQsQ0FBYjtBQUNBVCxxQkFBU2MsU0FBVCxFQUFvQmIsQ0FBcEI7QUFDQTtBQUNEO0FBQ0EsWUFBSUYsUUFBUUssT0FBUixDQUFnQkMsSUFBaEIsQ0FBcUJDLE9BQXJCLENBQTZCLElBQTdCLEtBQXNDLENBQTFDLEVBQTZDO0FBQzVDTCxjQUFFTSxNQUFGLEdBQVcsSUFBWDtBQUNBTixjQUFFTyxLQUFGLEdBQVUsR0FBVjtBQUNBLGdCQUFJQyxLQUFLLEVBQVQ7QUFDQUEsZUFBR0MsVUFBSCxHQUFnQixLQUFLQyxNQUFyQjtBQUNBRixlQUFHRyxRQUFILEdBQWNiLFFBQVFLLE9BQVIsQ0FBZ0JDLElBQWhCLENBQXFCTSxNQUFuQztBQUNBRixlQUFHRCxLQUFILEdBQVcsR0FBWDtBQUNBUCxjQUFFWSxRQUFGLEdBQWEsQ0FBQ0osRUFBRCxDQUFiO0FBQ0FULHFCQUFTYyxTQUFULEVBQW9CYixDQUFwQjtBQUNBO0FBQ0Q7QUFDREMsZ0JBQVFDLEdBQVIsQ0FBWSxxQkFBWjtBQUNFRixVQUFFTSxNQUFGLEdBQVcsTUFBWDtBQUNBTixVQUFFTyxLQUFGLEdBQVUsR0FBVjtBQUNBLFlBQUlDLEtBQUssRUFBVDtBQUNBQSxXQUFHQyxVQUFILEdBQWdCLFFBQVFDLE1BQXhCO0FBQ0FGLFdBQUdHLFFBQUgsR0FBY2IsUUFBUUssT0FBUixDQUFnQkMsSUFBaEIsQ0FBcUJNLE1BQW5DO0FBQ0FGLFdBQUdELEtBQUgsR0FBVyxHQUFYO0FBQ0FQLFVBQUVZLFFBQUYsR0FBYSxFQUFiO0FBQ0FiLGlCQUFTYyxTQUFULEVBQW9CYixDQUFwQjtBQUNILEtBbkNEO0FBb0NGLFdBQUFlLHNCQUFBO0FBekNBLENBQUEsRUFBQTtBQTJDQSxJQUFNQyxZQUFZQyxNQUFsQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUVBLElBQUlDLEdBQUo7QUFDQTtBQUNBO0FBQ0E7QUFFQTs7Ozs7O0FBTUEsU0FBQUMsT0FBQSxDQUFpQkMsU0FBakIsRUFBMEI7QUFDeEJGLFVBQU0sSUFBSTFCLFFBQVE2QixZQUFaLENBQXlCRCxTQUF6QixDQUFOO0FBRUE7QUFDQTtBQUNBO0FBQ0EsUUFBSUUsYUFBYSxJQUFJM0IsZ0JBQUosRUFBakIsQ0FOd0IsQ0FNaUI7QUFFekMsUUFBSTRCLFNBQVMsSUFBSS9CLFFBQVFnQyxZQUFaLENBQXlCLEVBQUVDLGFBQWEsQ0FBQ0gsVUFBRCxDQUFmLEVBQXpCLENBQWI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQSxRQUFJSSxlQUFlLElBQUlsQyxRQUFRZ0MsWUFBWixDQUF5QixFQUFFQyxhQUFhLENBQUUsSUFBSVYsc0JBQUosRUFBRixDQUFmLEVBQXpCLENBQW5CO0FBR0FHLFFBQUlLLE1BQUosQ0FBVyxTQUFYLEVBQXNCRyxZQUF0QjtBQUNBQSxpQkFBYUMsT0FBYixDQUFxQixVQUFTQyxPQUFULEVBQWdCO0FBQ25DQSxnQkFBUUMsSUFBUixDQUFhLHFDQUFiO0FBQ0QsS0FGRDtBQUlBSCxpQkFBYUksT0FBYixDQUFxQixXQUFyQixFQUFrQyxDQUNoQyxVQUFTRixPQUFULEVBQWtCRyxJQUFsQixFQUF3QkMsSUFBeEIsRUFBNEI7QUFDMUJKLGdCQUFRSyxVQUFSLENBQW1CQyxHQUFuQixHQUF5QkgsUUFBUSxFQUFqQztBQUNBdkMsZ0JBQVEyQyxPQUFSLENBQWdCL0IsSUFBaEIsQ0FBcUJ3QixPQUFyQixFQUE4QixtQkFBOUI7QUFDRCxLQUorQixFQUtoQyxVQUFVQSxPQUFWLEVBQW1CUSxPQUFuQixFQUE0QkosSUFBNUIsRUFBZ0M7QUFDOUJKLGdCQUFRSyxVQUFSLENBQW1CQyxHQUFuQixHQUF5QkUsUUFBUUMsT0FBakM7QUFDQUw7QUFDRCxLQVIrQixFQVNoQyxVQUFVSixPQUFWLEVBQW1CUSxPQUFuQixFQUEwQjtBQUN4QlIsZ0JBQVFVLG1CQUFSLENBQTRCLEVBQUVDLFVBQVdYLFFBQVFLLFVBQVIsQ0FBbUJDLEdBQWhDLEVBQTVCO0FBQ0QsS0FYK0IsQ0FBbEM7QUFlQVIsaUJBQWFJLE9BQWIsQ0FBcUIsYUFBckIsRUFBb0MsQ0FDbEMsVUFBU0YsT0FBVCxFQUFrQkcsSUFBbEIsRUFBd0JDLElBQXhCLEVBQTRCO0FBQzFCSixnQkFBUUssVUFBUixDQUFtQkMsR0FBbkIsR0FBeUJILFFBQVEsRUFBakM7QUFDQXZDLGdCQUFRMkMsT0FBUixDQUFnQi9CLElBQWhCLENBQXFCd0IsT0FBckIsRUFBOEIsc0JBQTlCO0FBQ0QsS0FKaUMsRUFLbEMsVUFBVUEsT0FBVixFQUFtQlEsT0FBbkIsRUFBNEJKLElBQTVCLEVBQWdDO0FBQzlCSixnQkFBUUssVUFBUixDQUFtQkMsR0FBbkIsR0FBeUIsQ0FBQyxDQUExQixDQUQ4QixDQUNEO0FBQzdCRjtBQUNELEtBUmlDLEVBU2xDLFVBQVVKLE9BQVYsRUFBbUJRLE9BQW5CLEVBQTBCO0FBQ3hCUixnQkFBUVUsbUJBQVIsQ0FBNEI7QUFDM0JDLHNCQUFXLEVBQUVDLEtBQU0sTUFBUixFQUFpQnhDLEdBQUk0QixRQUFRSyxVQUFSLENBQW1CQyxHQUF4QyxFQURnQixFQUE1QjtBQUVELEtBWmlDLENBQXBDO0FBZ0JBaEIsUUFBSUssTUFBSixDQUFXLFFBQVgsRUFBcUIsQ0FDbkIsVUFBU0ssT0FBVCxFQUFrQkcsSUFBbEIsRUFBd0JDLElBQXhCLEVBQTRCO0FBQzFCSixnQkFBUWEsVUFBUixDQUFtQlAsR0FBbkIsR0FBeUJILFFBQVEsRUFBakM7QUFDQXZDLGdCQUFRMkMsT0FBUixDQUFnQi9CLElBQWhCLENBQXFCd0IsT0FBckIsRUFBOEIseUJBQTlCO0FBQ0QsS0FKa0IsRUFLbkIsVUFBVUEsT0FBVixFQUFtQlEsT0FBbkIsRUFBNEJKLElBQTVCLEVBQWdDO0FBQzlCSixnQkFBUUssVUFBUixDQUFtQkMsR0FBbkIsR0FBeUJFLFFBQVFDLE9BQWpDO0FBQ0QsS0FQa0IsRUFRbkIsVUFBVVQsT0FBVixFQUFtQlEsT0FBbkIsRUFBMEI7QUFDeEJSLGdCQUFRVSxtQkFBUixDQUE0QixFQUFFQyxVQUFXWCxRQUFRYyxVQUFSLENBQW1CUixHQUFoQyxFQUE1QjtBQUNELEtBVmtCLENBQXJCO0FBY0FoQixRQUFJSyxNQUFKLENBQVcsR0FBWCxFQUFnQkEsTUFBaEI7QUFFQUEsV0FBT08sT0FBUCxDQUFlLFlBQWYsRUFBNkIsQ0FDM0IsVUFBVUYsT0FBVixFQUFtQkcsSUFBbkIsRUFBeUJDLElBQXpCLEVBQTZCO0FBQzNCLFlBQUlXLGtCQUFrQixFQUF0QjtBQUNBLFlBQUlDLFVBQUo7QUFDQTtBQUNBLFlBQUlDLG1CQUFtQmQsS0FBS25CLFFBQUwsQ0FBY2tDLEdBQWQsQ0FBa0IsVUFBVUMsT0FBVixFQUFtQkMsTUFBbkIsRUFBeUI7QUFDaEUsZ0JBQUlMLGdCQUFnQkssTUFBaEIsQ0FBSixFQUE2QjtBQUMzQix1QkFBT25DLFNBQVA7QUFDRDtBQUNELGdCQUFJb0MsSUFBSUQsU0FBUyxDQUFqQjtBQUNBSix5QkFBYTVCLFVBQVVrQyxNQUFWLENBQWlCLEVBQWpCLEVBQXFCSCxPQUFyQixDQUFiO0FBRUEsbUJBQU9FLElBQUlsQixLQUFLbkIsUUFBTCxDQUFjRixNQUF6QixFQUFpQztBQUMvQixvQkFBSXlDLFFBQVFwQixLQUFLbkIsUUFBTCxDQUFjcUMsQ0FBZCxDQUFaO0FBQ0Esb0JBQUlFLE1BQU1yQyxJQUFOLEtBQWVpQyxRQUFRakMsSUFBdkIsS0FDRHFDLE1BQU0xQyxVQUFOLEtBQXNCbUMsV0FBV2pDLFFBQVgsR0FBc0IsQ0FBNUMsSUFDQ3dDLE1BQU0xQyxVQUFOLEtBQXNCbUMsV0FBV2pDLFFBQVgsR0FBc0IsQ0FGNUMsQ0FBSixFQUdLO0FBQ0gsd0JBQUl5QyxTQUFTRCxNQUFNMUMsVUFBTixLQUFzQm1DLFdBQVdqQyxRQUFYLEdBQXNCLENBQXpEO0FBQ0FnQyxvQ0FBZ0JNLENBQWhCLElBQXFCLElBQXJCO0FBQ0FMLCtCQUFXUyxNQUFYLEdBQW9CVCxXQUFXUyxNQUFYLElBQ2pCRCxTQUFTLEdBQVQsR0FBZSxFQURFLElBRWxCRCxNQUFNRSxNQUZSO0FBR0FULCtCQUFXakMsUUFBWCxHQUFzQndDLE1BQU14QyxRQUE1QjtBQUNBc0Msd0JBQUlBLElBQUksQ0FBUjtBQUNELGlCQVhELE1BV087QUFDTEEsd0JBQUlsQixLQUFLbkIsUUFBTCxDQUFjRixNQUFsQjtBQUNEO0FBQ0YsYUF2QitELENBdUI5RDtBQUNGLG1CQUFPa0MsVUFBUDtBQUNELFNBekJzQixDQUF2QjtBQTBCQTNDLGdCQUFRQyxHQUFSLENBQVksYUFBWjtBQUNBMkMsMkJBQW1CQSxpQkFBaUJTLE1BQWpCLENBQXdCLFVBQVVQLE9BQVYsRUFBaUI7QUFBSSxtQkFBT0EsWUFBWWxDLFNBQW5CO0FBQStCLFNBQTVFLENBQW5CO0FBQ0FaLGdCQUFRQyxHQUFSLENBQVksVUFBVXFELEtBQUtDLFNBQUwsQ0FBZXpCLEtBQUtuQixRQUFwQixDQUF0QixFQUFxREMsU0FBckQsRUFBZ0UsQ0FBaEU7QUFDQVosZ0JBQVFDLEdBQVIsQ0FBWSxlQUFlcUQsS0FBS0MsU0FBTCxDQUFlWCxnQkFBZixFQUFpQ2hDLFNBQWpDLEVBQTRDLENBQTVDLENBQTNCO0FBQ047Ozs7Ozs7Ozs7Ozs7QUFhQTs7Ozs7O0FBTU1aLGdCQUFRQyxHQUFSLENBQVksb0JBQW9CcUQsS0FBS0MsU0FBTCxDQUFlekIsS0FBS25CLFFBQXBCLEVBQThCQyxTQUE5QixFQUF5QyxDQUF6QyxDQUFoQztBQUVBZSxnQkFBUUMsSUFBUixDQUFhLG9CQUFiO0FBQ0E7QUFDQTtBQUNELEtBM0QwQixDQUE3QjtBQThEQU4sV0FBT08sT0FBUCxDQUFlLE9BQWYsRUFBeUIsQ0FDdkIsVUFBVUYsT0FBVixFQUFtQkcsSUFBbkIsRUFBeUJDLElBQXpCLEVBQTZCO0FBQzVCSixnQkFBUTZCLFdBQVIsQ0FBb0IsU0FBcEIsRUFBK0I3QixRQUFROEIsUUFBUixDQUFpQkMsS0FBaEQ7QUFDQSxLQUhzQixFQUl2QixVQUFVL0IsT0FBVixFQUFtQlEsT0FBbkIsRUFBNEJKLElBQTVCLEVBQWdDO0FBQzlCLFlBQUk0QixRQUFRaEMsUUFBUUssVUFBUixDQUFtQjJCLEtBQS9CO0FBQ0FoQyxnQkFBUUMsSUFBUixDQUFhLHVCQUF1QjBCLEtBQUtDLFNBQUwsQ0FBZXBCLE9BQWYsQ0FBcEM7QUFDQUo7QUFDRCxLQVJzQixFQVN2QixVQUFVSixPQUFWLEVBQW1CUSxPQUFuQixFQUEwQjtBQUN0QlIsZ0JBQVFDLElBQVIsQ0FBYSxjQUFiO0FBQ0gsS0FYc0IsQ0FBekI7QUFjQU4sV0FBT08sT0FBUCxDQUFlLE1BQWYsRUFBdUIsQ0FDckIsVUFBVUYsT0FBVixFQUFtQkcsSUFBbkIsRUFBeUJDLElBQXpCLEVBQTZCO0FBQzNCL0IsZ0JBQVFDLEdBQVIsQ0FBWSxRQUFaO0FBQ0FELGdCQUFRQyxHQUFSLENBQVksU0FBU3FELEtBQUtDLFNBQUwsQ0FBZXpCLEtBQUtuQixRQUFwQixDQUFyQjtBQUNELEtBSm9CLENBQXZCO0FBT0E7QUFDQVcsV0FBT08sT0FBUCxDQUFlLE9BQWYsRUFBd0IsQ0FDdEIsVUFBVUYsT0FBVixFQUFtQkcsSUFBbkIsRUFBeUJDLElBQXpCLEVBQTZCO0FBQzNCL0IsZ0JBQVFDLEdBQVIsQ0FBWSxPQUFaO0FBQ0E7QUFDQSxZQUFJMkQsUUFBUXJFLFFBQVFzRSxnQkFBUixDQUF5QkMsVUFBekIsQ0FBb0NoQyxLQUFLbkIsUUFBekMsRUFBbUQscUJBQW5ELENBQVo7QUFDQSxZQUFJb0QsT0FBT3hFLFFBQVFzRSxnQkFBUixDQUF5QkcsV0FBekIsQ0FBcUNsQyxLQUFLbkIsUUFBMUMsQ0FBWDtBQUNBLFlBQUlnRCxRQUFRaEMsUUFBUUssVUFBUixDQUFtQjJCLEtBQW5CLEdBQTJCO0FBQ3JDQyxtQkFBT0EsUUFBUUEsTUFBTVIsTUFBZCxHQUF1QixJQURPO0FBRXJDYSx1QkFBV0YsT0FBT0EsS0FBS0csT0FBTCxFQUFQLEdBQXdCO0FBRkUsU0FBdkM7QUFJQTtBQUNBLFlBQUksQ0FBQ1AsTUFBTUMsS0FBWCxFQUFrQjtBQUNoQnJFLG9CQUFRMkMsT0FBUixDQUFnQi9CLElBQWhCLENBQXFCd0IsT0FBckIsRUFBOEIsb0NBQTlCO0FBQ0QsU0FGRCxNQUVPO0FBQ0xJO0FBQ0Q7QUFDRixLQWhCcUIsRUFpQnRCLFVBQVVKLE9BQVYsRUFBbUJRLE9BQW5CLEVBQTRCSixJQUE1QixFQUFnQztBQUM5QixZQUFJNEIsUUFBUWhDLFFBQVFLLFVBQVIsQ0FBbUIyQixLQUEvQjtBQUNBLFlBQUl4QixRQUFRRyxRQUFaLEVBQXNCO0FBQ3BCcUIsa0JBQU1DLEtBQU4sR0FBY3pCLFFBQVFHLFFBQXRCO0FBQ0Q7QUFFRDtBQUNBLFlBQUlxQixNQUFNQyxLQUFOLElBQWUsQ0FBQ0QsTUFBTU0sU0FBMUIsRUFBcUM7QUFDbkMxRSxvQkFBUTJDLE9BQVIsQ0FBZ0I2QixJQUFoQixDQUFxQnBDLE9BQXJCLEVBQThCLGdEQUE5QjtBQUNELFNBRkQsTUFFTztBQUNMSTtBQUNEO0FBQ0YsS0E3QnFCLEVBOEJ0QixVQUFVSixPQUFWLEVBQW1CUSxPQUFuQixFQUEwQjtBQUN4QixZQUFJd0IsUUFBUWhDLFFBQVFLLFVBQVIsQ0FBbUIyQixLQUEvQjtBQUNBLFlBQUl4QixRQUFRRyxRQUFaLEVBQXNCO0FBQ3BCLGdCQUFJeUIsT0FBT3hFLFFBQVFzRSxnQkFBUixDQUF5QkcsV0FBekIsQ0FBcUMsQ0FBQzdCLFFBQVFHLFFBQVQsQ0FBckMsQ0FBWDtBQUNBcUIsa0JBQU1NLFNBQU4sR0FBa0JGLE9BQU9BLEtBQUtHLE9BQUwsRUFBUCxHQUF3QixJQUExQztBQUNEO0FBQ0Q7QUFDQSxZQUFJUCxNQUFNQyxLQUFOLElBQWVELE1BQU1NLFNBQXpCLEVBQW9DO0FBQ2xDO0FBQ0FOLGtCQUFNUSxPQUFOLEdBQWdCeEMsUUFBUXpCLE9BQVIsQ0FBZ0JpRSxPQUFoQztBQUNBQyxtQkFBT1QsTUFBTUMsS0FBYixJQUFzQkQsS0FBdEI7QUFFQTtBQUNBLGdCQUFJVSxPQUFPLElBQUlDLElBQUosQ0FBU1gsTUFBTU0sU0FBZixDQUFYO0FBQ0EsZ0JBQUlNLE9BQU9GLEtBQUtHLFFBQUwsS0FBa0IsRUFBN0I7QUFDQTdDLG9CQUFRQyxJQUFSLENBQWEsa0RBQWIsRUFDRStCLE1BQU1DLEtBRFIsRUFFRVMsS0FBS0ksUUFBTCxLQUFrQixDQUZwQixFQUV1QkosS0FBS0ssT0FBTCxFQUZ2QixFQUV1Q0wsS0FBS00sV0FBTCxFQUZ2QyxFQUdFSixPQUFPRixLQUFLRyxRQUFMLEVBQVAsR0FBeUJILEtBQUtHLFFBQUwsS0FBa0IsRUFIN0MsRUFHaURILEtBQUtPLFVBQUwsRUFIakQsRUFHb0VMLE9BQU8sSUFBUCxHQUFjLElBSGxGO0FBSUQsU0FaRCxNQVlPO0FBQ0w1QyxvQkFBUUMsSUFBUixDQUFhLG1CQUFiO0FBQ0Q7QUFDRixLQXBEcUIsQ0FBeEI7QUF1REFOLFdBQU91RCxTQUFQLENBQWlCdEYsUUFBUXVGLFlBQVIsQ0FBcUJsRCxJQUFyQixDQUEwQixpRUFBMUIsQ0FBakI7QUFFQTtBQUNBLFFBQUl3QyxTQUFTLEVBQWI7QUFDQVcsZ0JBQVksWUFBQTtBQUNWLFlBQUlDLE1BQU0sSUFBSVYsSUFBSixHQUFXSixPQUFYLEVBQVY7QUFDQSxhQUFLLElBQUllLEdBQVQsSUFBZ0JiLE1BQWhCLEVBQXdCO0FBQ3RCLGdCQUFJVCxRQUFRUyxPQUFPYSxHQUFQLENBQVo7QUFDQSxnQkFBSUQsT0FBT3JCLE1BQU1NLFNBQWpCLEVBQTRCO0FBQzFCLG9CQUFJaUIsTUFBTSxJQUFJM0YsUUFBUTRGLE9BQVosR0FDUGhCLE9BRE8sQ0FDQ1IsTUFBTVEsT0FEUCxFQUVQaEUsSUFGTyxDQUVGLDRCQUZFLEVBRTRCd0QsTUFBTUMsS0FGbEMsQ0FBVjtBQUdBM0Msb0JBQUlXLElBQUosQ0FBU3NELEdBQVQ7QUFDQSx1QkFBT2QsT0FBT2EsR0FBUCxDQUFQO0FBQ0Q7QUFDRjtBQUNGLEtBWkQsRUFZRyxLQVpIO0FBYUQ7QUFFRCxJQUFJRyxNQUFKLEVBQVk7QUFDVkEsV0FBT0MsT0FBUCxHQUFpQjtBQUNmbkUsaUJBQVNBO0FBRE0sS0FBakI7QUFHRCIsImZpbGUiOiJib3QvZHVtYmRpYWxvZy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVGhlIGJvdCBpbXBsZW1lbnRhdGlvblxuICpcbiAqIEluc3RhbnRpYXRlIGFwc3NpbmcgYSBjb25uZWN0b3IgdmlhXG4gKiBtYWtlQm90XG4gKlxuICovXG5cbi8vIHZhciBleGVjID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNcblxuLy8gdmFyIHJlcXVlc3QyID0gcmVxdWlyZSgncmVxdWVzdC1kZWZhdWx0cycpXG4vLyB2YXIgcmVxdWVzdCA9IHJlcXVlc3QyLmdsb2JhbERlZmF1bHRzKHtcbi8vICAncHJveHknOiAnaHR0cDovL3Byb3h5OjgwODAnLFxuLy8gICdodHRwcy1wcm94eSc6ICdodHRwczovL3Byb3h5OjgwODAnXG4vLyB9KVxuXG5pbXBvcnQgKiBhcyBidWlsZGVyIGZyb20gJ2JvdGJ1aWxkZXInO1xuLy92YXIgYnVpbGRlciA9IHJlcXVpcmUoJ2JvdGJ1aWxkZXInKTtcblxudmFyIGRpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9tYXRjaC9kaXNwYXRjaGVyLmpzJykuZGlzcGF0Y2hlcjtcblxuXG5jbGFzcyBTaW1wbGVSZWNvZ25pemVyIGltcGxlbWVudHMgYnVpbGRlci5JSW50ZW50UmVjb2duaXplciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuXG4gIH1cblxuICByZWNvZ25pemUoY29udGV4dDogYnVpbGRlci5JUmVjb2duaXplQ29udGV4dCwgY2FsbGJhY2s6IChlcnI6IEVycm9yLCByZXN1bHQ6IGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXJSZXN1bHQpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB2YXIgdSA9IHt9IGFzIGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXJSZXN1bHQ7XG5cbiAgICBjb25zb2xlLmxvZyhcInJlY29nbml6aW5nIFwiICsgY29udGV4dC5tZXNzYWdlLnRleHQpO1xuICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwic3RhcnRcIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcIlNob3dFbnRpdHlcIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJzdGFydCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwidHJhaW5cIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcInRyYWluXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwidHJhaW4gXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJsZWFyblwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwibGVhcm5cIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS50eXBlID0gXCJ0cmFpbkZhY3RcIjtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInRyYWluIFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiaGVscFwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwiaGVscFwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInRyYWluIFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiZXhpdFwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwiZXhpdFwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwid3JvbmdcIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcIndyb25nXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygncmVjb2duaXppbmcgbm90aGluZycpO1xuICAgICAgdS5pbnRlbnQgPSBcIk5vbmVcIjtcbiAgICAgIHUuc2NvcmUgPSAwLjE7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjE7XG4gICAgICB1LmVudGl0aWVzID0gW107XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICB9XG59XG5cblxuY2xhc3MgU2ltcGxlVXBEb3duUmVjb2duaXplciBpbXBsZW1lbnRzIGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcblxuICB9XG5cbiAgcmVjb2duaXplKGNvbnRleHQ6IGJ1aWxkZXIuSVJlY29nbml6ZUNvbnRleHQsIGNhbGxiYWNrOiAoZXJyOiBFcnJvciwgcmVzdWx0OiBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdmFyIHUgPSB7fSBhcyBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0O1xuXG4gICAgY29uc29sZS5sb2coXCJyZWNvZ25pemluZyBcIiArIGNvbnRleHQubWVzc2FnZS50ZXh0KTtcbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImRvd25cIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcImRvd25cIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJzdGFydCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJ1cFwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwidXBcIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJ1cFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdyZWNvZ25pemluZyBub3RoaW5nJyk7XG4gICAgICB1LmludGVudCA9IFwiTm9uZVwiO1xuICAgICAgdS5zY29yZSA9IDAuMTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMTtcbiAgICAgIHUuZW50aXRpZXMgPSBbXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gIH1cbn1cblxuY29uc3QgQW55T2JqZWN0ID0gT2JqZWN0IGFzIGFueTtcbi8vIGdsb2JhbFR1bm5lbC5pbml0aWFsaXplKHtcbi8vICBob3N0OiAncHJveHkuZXh4eGFtcGxlLmNvbScsXG4vLyAgcG9ydDogODA4MFxuLy8gfSlcblxuLy8gQ3JlYXRlIGJvdCBhbmQgYmluZCB0byBjb25zb2xlXG4vLyB2YXIgY29ubmVjdG9yID0gbmV3IGh0bWxjb25uZWN0b3IuSFRNTENvbm5lY3RvcigpXG5cbi8vIGNvbm5lY3Rvci5zZXRBbnN3ZXJIb29rKGZ1bmN0aW9uIChzQW5zd2VyKSB7XG4vLyAgY29uc29sZS5sb2coJ0dvdCBhbnN3ZXIgOiAnICsgc0Fuc3dlciArICdcXG4nKVxuLy8gfSlcblxudmFyIGJvdDtcbi8vIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuLy8gICBjb25uZWN0b3IucHJvY2Vzc01lc3NhZ2UoJ3N0YXJ0IHVuaXQgdGVzdCBBQkMgJylcbi8vIH0sIDUwMDApXG5cbi8qKlxuICogQ29uc3RydWN0IGEgYm90XG4gKiBAcGFyYW0gY29ubmVjdG9yIHtDb25uZWN0b3J9IHRoZSBjb25uZWN0b3IgdG8gdXNlXG4gKiBIVE1MQ29ubmVjdG9yXG4gKiBvciBjb25uZWN0b3IgPSBuZXcgYnVpbGRlci5Db25zb2xlQ29ubmVjdG9yKCkubGlzdGVuKClcbiAqL1xuZnVuY3Rpb24gbWFrZUJvdChjb25uZWN0b3IpIHtcbiAgYm90ID0gbmV3IGJ1aWxkZXIuVW5pdmVyc2FsQm90KGNvbm5lY3Rvcik7XG5cbiAgLy8gQ3JlYXRlIExVSVMgcmVjb2duaXplciB0aGF0IHBvaW50cyBhdCBvdXIgbW9kZWwgYW5kIGFkZCBpdCBhcyB0aGUgcm9vdCAnLycgZGlhbG9nIGZvciBvdXIgQ29ydGFuYSBCb3QuXG4gIC8vIHZhciBtb2RlbCA9IHNlbnNpdGl2ZS5tb2RlbHVybDtcbiAgLy8gdmFyIG1vZGVsID0gJ2h0dHBzOi8vYXBpLnByb2plY3RveGZvcmQuYWkvbHVpcy92Mi4wL2FwcHMvYzQxM2IyZWYtMzgyYy00NWJkLThmZjAtZjc2ZDYwZTJhODIxP3N1YnNjcmlwdGlvbi1rZXk9YzIxMzk4YjU5ODBhNGNlMDlmNDc0YmJmZWU5M2I4OTImcT0nXG4gIHZhciByZWNvZ25pemVyID0gbmV3IFNpbXBsZVJlY29nbml6ZXIoKTsgLy8gYnVpbGRlci5MdWlzUmVjb2duaXplcihtb2RlbCk7XG5cbiAgdmFyIGRpYWxvZyA9IG5ldyBidWlsZGVyLkludGVudERpYWxvZyh7IHJlY29nbml6ZXJzOiBbcmVjb2duaXplcl0gfSk7XG4gIC8vIGRpYWxvZy5vbkJlZ2luKGZ1bmN0aW9uKHNlc3Npb24sYXJncykge1xuICAvLyBjb25zb2xlLmxvZyhcImJlZ2lubmluZyAuLi5cIilcbiAgLy8gc2Vzc2lvbi5kaWFsb2dEYXRhLnJldHJ5UHJvbXB0ID0gYXJncyAmJiBhcmdzLnJldHJ5UHJvbXB0IHx8IFwiSSBhbSBzb3JyeVwiXG4gIC8vIHNlc3Npb24uc2VuZChcIldoYXQgZG8geW91IHdhbnQ/XCIpXG4gIC8vXG4gIC8vIH0pXG5cbiAgdmFyIGRpYWxvZ1VwRG93biA9IG5ldyBidWlsZGVyLkludGVudERpYWxvZyh7IHJlY29nbml6ZXJzOiBbIG5ldyBTaW1wbGVVcERvd25SZWNvZ25pemVyKCldIH0pO1xuXG5cbiAgYm90LmRpYWxvZygnL3VwZG93bicsIGRpYWxvZ1VwRG93bik7XG4gIGRpYWxvZ1VwRG93bi5vbkJlZ2luKGZ1bmN0aW9uKHNlc3Npb24pIHtcbiAgICBzZXNzaW9uLnNlbmQoXCJIaSB0aGVyZSwgdXBkb3duIGlzIHdhaXRpbmcgZm9yIHlvdVwiKTtcbiAgfSlcblxuICBkaWFsb2dVcERvd24ubWF0Y2hlcygnaW50ZW50LnVwJywgW1xuICAgIGZ1bmN0aW9uKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ3lvdSB3YW50IHRvIGdvIHVwJyk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IHJlc3VsdHMucmVwb25zZTtcbiAgICAgIG5leHQoKTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoeyByZXNwb25zZSA6IHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgfSk7XG4gICAgfVxuICBdXG4gICk7XG5cbiAgZGlhbG9nVXBEb3duLm1hdGNoZXMoJ2ludGVudC5kb3duJywgW1xuICAgIGZ1bmN0aW9uKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ3lvdSB3YW50IHRvIGdvIGRvd24hJyk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IC0xOyAvLyByZXN1bHRzLnJlcG9uc2U7XG4gICAgICBuZXh0KCk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgc2Vzc2lvbi5lbmREaWFsb2dXaXRoUmVzdWx0KHtcbiAgICAgICByZXNwb25zZSA6IHsgcmVzIDogXCJkb3duXCIgLCB1IDogc2Vzc2lvbi5kaWFsb2dEYXRhLmFiY30gfSk7XG4gICAgfVxuICBdXG4gICk7XG5cbiAgYm90LmRpYWxvZygnL3RyYWluJywgW1xuICAgIGZ1bmN0aW9uKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbGdvRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ0RvIHlvdSB3YW50IHRvIHRyYWluIG1lJyk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IHJlc3VsdHMucmVwb25zZTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoeyByZXNwb25zZSA6IHNlc3Npb24uRGlhbG9nRGF0YS5hYmMgfSk7XG4gICAgfVxuICBdKTtcblxuXG4gIGJvdC5kaWFsb2coJy8nLCBkaWFsb2cpO1xuXG4gIGRpYWxvZy5tYXRjaGVzKCdTaG93RW50aXR5JywgW1xuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICB2YXIgaXNDb21iaW5lZEluZGV4ID0ge307XG4gICAgICB2YXIgb05ld0VudGl0eTtcbiAgICAgIC8vIGZ1c2UgZW50aXRpZXNcbiAgICAgIHZhciBjb21iaW5lZEVudGl0aWVzID0gYXJncy5lbnRpdGllcy5tYXAoZnVuY3Rpb24gKG9FbnRpdHksIGlJbmRleCkge1xuICAgICAgICBpZiAoaXNDb21iaW5lZEluZGV4W2lJbmRleF0pIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpID0gaUluZGV4ICsgMTtcbiAgICAgICAgb05ld0VudGl0eSA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9FbnRpdHkpO1xuXG4gICAgICAgIHdoaWxlIChpIDwgYXJncy5lbnRpdGllcy5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgb05leHQgPSBhcmdzLmVudGl0aWVzW2ldO1xuICAgICAgICAgIGlmIChvTmV4dC50eXBlID09PSBvRW50aXR5LnR5cGUgJiZcbiAgICAgICAgICAgIChvTmV4dC5zdGFydEluZGV4ID09PSAob05ld0VudGl0eS5lbmRJbmRleCArIDEpIHx8XG4gICAgICAgICAgICAgIG9OZXh0LnN0YXJ0SW5kZXggPT09IChvTmV3RW50aXR5LmVuZEluZGV4ICsgMilcbiAgICAgICAgICAgICkpIHtcbiAgICAgICAgICAgIHZhciBzcGFjZWQgPSBvTmV4dC5zdGFydEluZGV4ID09PSAob05ld0VudGl0eS5lbmRJbmRleCArIDIpO1xuICAgICAgICAgICAgaXNDb21iaW5lZEluZGV4W2ldID0gdHJ1ZTtcbiAgICAgICAgICAgIG9OZXdFbnRpdHkuZW50aXR5ID0gb05ld0VudGl0eS5lbnRpdHkgK1xuICAgICAgICAgICAgICAoc3BhY2VkID8gJyAnIDogJycpICtcbiAgICAgICAgICAgICAgb05leHQuZW50aXR5O1xuICAgICAgICAgICAgb05ld0VudGl0eS5lbmRJbmRleCA9IG9OZXh0LmVuZEluZGV4O1xuICAgICAgICAgICAgaSA9IGkgKyAxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpID0gYXJncy5lbnRpdGllcy5sZW5ndGg7XG4gICAgICAgICAgfVxuICAgICAgICB9IC8vIHdoaWxlXG4gICAgICAgIHJldHVybiBvTmV3RW50aXR5O1xuICAgICAgfSk7XG4gICAgICBjb25zb2xlLmxvZyhcIlNob3cgRW50aXR5XCIpO1xuICAgICAgY29tYmluZWRFbnRpdGllcyA9IGNvbWJpbmVkRW50aXRpZXMuZmlsdGVyKGZ1bmN0aW9uIChvRW50aXR5KSB7IHJldHVybiBvRW50aXR5ICE9PSB1bmRlZmluZWQ7IH0pO1xuICAgICAgY29uc29sZS5sb2coJ3JhdzogJyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpLCB1bmRlZmluZWQsIDIpO1xuICAgICAgY29uc29sZS5sb2coJ2NvbWJpbmVkOiAnICsgSlNPTi5zdHJpbmdpZnkoY29tYmluZWRFbnRpdGllcywgdW5kZWZpbmVkLCAyKSk7XG4vKlxuICAgICAgdmFyIHN5c3RlbUlkID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ1N5c3RlbUlkJyk7XG4gICAgICB2YXIgY2xpZW50ID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ2NsaWVudCcpO1xuICAgICAgdmFyIHN5c3RlbU9iamVjdElkID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ3N5c3RlbU9iamVjdElkJykgfHxcbiAgICAgICAgYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ1N5c3RlbU9iamVjdCcpIHx8XG4gICAgICAgIGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGNvbWJpbmVkRW50aXRpZXMsICdidWlsdGluLm51bWJlcicpO1xuICAgICAgdmFyIHN5c3RlbU9iamVjdENhdGVnb3J5ID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ1N5c3RlbU9iamVjdENhdGVnb3J5Jyk7XG5cbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5zeXN0ZW0gPSB7XG4gICAgICAgIHN5c3RlbUlkOiBzeXN0ZW1JZCxcbiAgICAgICAgY2xpZW50OiBjbGllbnRcbiAgICAgIH07XG4qL1xuLypcbiAgICAgIHZhciBzU3lzdGVtSWQgPSBzeXN0ZW1JZCAmJiBzeXN0ZW1JZC5lbnRpdHk7XG4gICAgICB2YXIgc0NsaWVudCA9IGNsaWVudCAmJiBjbGllbnQuZW50aXR5O1xuICAgICAgdmFyIHNzeXN0ZW1PYmplY3RJZCA9IHN5c3RlbU9iamVjdElkICYmIHN5c3RlbU9iamVjdElkLmVudGl0eTtcbiAgICAgIHZhciBzU3lzdGVtT2JqZWN0Q2F0ZWdvcnkgPSBzeXN0ZW1PYmplY3RDYXRlZ29yeSAmJiBzeXN0ZW1PYmplY3RDYXRlZ29yeS5lbnRpdHk7XG4qL1xuICAgICAgY29uc29sZS5sb2coJ1Nob3cgZW50aXRpZXM6ICcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzLCB1bmRlZmluZWQsIDIpKTtcblxuICAgICAgc2Vzc2lvbi5zZW5kKCdTaG93aW5nIGVudGl0eSAuLi4nKTtcbiAgICAgIC8vICBjb25zb2xlLmxvZyhcInNob3cgZW50aXR5LCBTaG93IHNlc3Npb24gOiBcIiArIEpTT04uc3RyaW5naWZ5KHNlc3Npb24pKVxuICAgICAgLy8gY29uc29sZS5sb2coXCJTaG93IGVudGl0eSA6IFwiICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcykpXG4gICAgfVxuICBdKTtcblxuICBkaWFsb2cubWF0Y2hlcygnd3JvbmcnLCAgW1xuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgIHNlc3Npb24uYmVnaW5EaWFsb2coJy91cGRvd24nLCBzZXNzaW9uLnVzZXJEYXRhLmNvdW50ICk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgc2Vzc2lvbi5zZW5kKFwiYmFjayBmcm9tIHdyb25nIDogXCIgKyBKU09OLnN0cmluZ2lmeShyZXN1bHRzKSk7XG4gICAgICBuZXh0KCk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgICBzZXNzaW9uLnNlbmQoJ2VuZCBvZiB3cm9uZycpO1xuICAgIH1cbiAgXSk7XG5cbiAgZGlhbG9nLm1hdGNoZXMoJ2V4aXQnLCBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdleGl0IDonKTtcbiAgICAgIGNvbnNvbGUubG9nKCdleGl0JyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpKTtcbiAgICB9XG4gIF0pO1xuXG4gIC8vIEFkZCBpbnRlbnQgaGFuZGxlcnNcbiAgZGlhbG9nLm1hdGNoZXMoJ3RyYWluJywgW1xuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICBjb25zb2xlLmxvZygndHJhaW4nKTtcbiAgICAgIC8vIFJlc29sdmUgYW5kIHN0b3JlIGFueSBlbnRpdGllcyBwYXNzZWQgZnJvbSBMVUlTLlxuICAgICAgdmFyIHRpdGxlID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ2J1aWx0aW4uYWxhcm0udGl0bGUnKTtcbiAgICAgIHZhciB0aW1lID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLnJlc29sdmVUaW1lKGFyZ3MuZW50aXRpZXMpO1xuICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtID0ge1xuICAgICAgICB0aXRsZTogdGl0bGUgPyB0aXRsZS5lbnRpdHkgOiBudWxsLFxuICAgICAgICB0aW1lc3RhbXA6IHRpbWUgPyB0aW1lLmdldFRpbWUoKSA6IG51bGxcbiAgICAgIH07XG4gICAgICAvLyBQcm9tcHQgZm9yIHRpdGxlXG4gICAgICBpZiAoIWFsYXJtLnRpdGxlKSB7XG4gICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdXaGF0IGZhY3Qgd291bGQgeW91IGxpa2UgdG8gdHJhaW4/Jyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgYWxhcm0udGl0bGUgPSByZXN1bHRzLnJlc3BvbnNlO1xuICAgICAgfVxuXG4gICAgICAvLyBQcm9tcHQgZm9yIHRpbWUgKHRpdGxlIHdpbGwgYmUgYmxhbmsgaWYgdGhlIHVzZXIgc2FpZCBjYW5jZWwpXG4gICAgICBpZiAoYWxhcm0udGl0bGUgJiYgIWFsYXJtLnRpbWVzdGFtcCkge1xuICAgICAgICBidWlsZGVyLlByb21wdHMudGltZShzZXNzaW9uLCAnV2hhdCB0aW1lIHdvdWxkIHlvdSBsaWtlIHRvIHNldCB0aGUgYWxhcm0gZm9yPycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICAgIGlmIChyZXN1bHRzLnJlc3BvbnNlKSB7XG4gICAgICAgIHZhciB0aW1lID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLnJlc29sdmVUaW1lKFtyZXN1bHRzLnJlc3BvbnNlXSk7XG4gICAgICAgIGFsYXJtLnRpbWVzdGFtcCA9IHRpbWUgPyB0aW1lLmdldFRpbWUoKSA6IG51bGw7XG4gICAgICB9XG4gICAgICAvLyBTZXQgdGhlIGFsYXJtIChpZiB0aXRsZSBvciB0aW1lc3RhbXAgaXMgYmxhbmsgdGhlIHVzZXIgc2FpZCBjYW5jZWwpXG4gICAgICBpZiAoYWxhcm0udGl0bGUgJiYgYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgIC8vIFNhdmUgYWRkcmVzcyBvZiB3aG8gdG8gbm90aWZ5IGFuZCB3cml0ZSB0byBzY2hlZHVsZXIuXG4gICAgICAgIGFsYXJtLmFkZHJlc3MgPSBzZXNzaW9uLm1lc3NhZ2UuYWRkcmVzcztcbiAgICAgICAgYWxhcm1zW2FsYXJtLnRpdGxlXSA9IGFsYXJtO1xuXG4gICAgICAgIC8vIFNlbmQgY29uZmlybWF0aW9uIHRvIHVzZXJcbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShhbGFybS50aW1lc3RhbXApO1xuICAgICAgICB2YXIgaXNBTSA9IGRhdGUuZ2V0SG91cnMoKSA8IDEyO1xuICAgICAgICBzZXNzaW9uLnNlbmQoJ0NyZWF0aW5nIGFsYXJtIG5hbWVkIFwiJXNcIiBmb3IgJWQvJWQvJWQgJWQ6JTAyZCVzJyxcbiAgICAgICAgICBhbGFybS50aXRsZSxcbiAgICAgICAgICBkYXRlLmdldE1vbnRoKCkgKyAxLCBkYXRlLmdldERhdGUoKSwgZGF0ZS5nZXRGdWxsWWVhcigpLFxuICAgICAgICAgIGlzQU0gPyBkYXRlLmdldEhvdXJzKCkgOiBkYXRlLmdldEhvdXJzKCkgLSAxMiwgZGF0ZS5nZXRNaW51dGVzKCksIGlzQU0gPyAnYW0nIDogJ3BtJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXNzaW9uLnNlbmQoJ09rLi4uIG5vIHByb2JsZW0uJyk7XG4gICAgICB9XG4gICAgfVxuICBdKTtcblxuICBkaWFsb2cub25EZWZhdWx0KGJ1aWxkZXIuRGlhbG9nQWN0aW9uLnNlbmQoJ0lcXCdtIHNvcnJ5IEkgZGlkblxcJ3QgdW5kZXJzdGFuZC4gSSBjYW4gb25seSBzaG93IHN0YXJ0IGFuZCByaW5nJykpO1xuXG4gIC8vIFZlcnkgc2ltcGxlIGFsYXJtIHNjaGVkdWxlclxuICB2YXIgYWxhcm1zID0ge307XG4gIHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgZm9yICh2YXIga2V5IGluIGFsYXJtcykge1xuICAgICAgdmFyIGFsYXJtID0gYWxhcm1zW2tleV07XG4gICAgICBpZiAobm93ID49IGFsYXJtLnRpbWVzdGFtcCkge1xuICAgICAgICB2YXIgbXNnID0gbmV3IGJ1aWxkZXIuTWVzc2FnZSgpXG4gICAgICAgICAgLmFkZHJlc3MoYWxhcm0uYWRkcmVzcylcbiAgICAgICAgICAudGV4dCgnSGVyZVxcJ3MgeW91ciBcXCclc1xcJyBhbGFybS4nLCBhbGFybS50aXRsZSk7XG4gICAgICAgIGJvdC5zZW5kKG1zZyk7XG4gICAgICAgIGRlbGV0ZSBhbGFybXNba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIDE1MDAwKTtcbn1cblxuaWYgKG1vZHVsZSkge1xuICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBtYWtlQm90OiBtYWtlQm90XG4gIH07XG59XG4iLCIvKipcbiAqIFRoZSBib3QgaW1wbGVtZW50YXRpb25cbiAqXG4gKiBJbnN0YW50aWF0ZSBhcHNzaW5nIGEgY29ubmVjdG9yIHZpYVxuICogbWFrZUJvdFxuICpcbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG4vLyB2YXIgZXhlYyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5leGVjXG4vLyB2YXIgcmVxdWVzdDIgPSByZXF1aXJlKCdyZXF1ZXN0LWRlZmF1bHRzJylcbi8vIHZhciByZXF1ZXN0ID0gcmVxdWVzdDIuZ2xvYmFsRGVmYXVsdHMoe1xuLy8gICdwcm94eSc6ICdodHRwOi8vcHJveHk6ODA4MCcsXG4vLyAgJ2h0dHBzLXByb3h5JzogJ2h0dHBzOi8vcHJveHk6ODA4MCdcbi8vIH0pXG52YXIgYnVpbGRlciA9IHJlcXVpcmUoJ2JvdGJ1aWxkZXInKTtcbi8vdmFyIGJ1aWxkZXIgPSByZXF1aXJlKCdib3RidWlsZGVyJyk7XG52YXIgZGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL21hdGNoL2Rpc3BhdGNoZXIuanMnKS5kaXNwYXRjaGVyO1xudmFyIFNpbXBsZVJlY29nbml6ZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFNpbXBsZVJlY29nbml6ZXIoKSB7XG4gICAgfVxuICAgIFNpbXBsZVJlY29nbml6ZXIucHJvdG90eXBlLnJlY29nbml6ZSA9IGZ1bmN0aW9uIChjb250ZXh0LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgdSA9IHt9O1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlY29nbml6aW5nIFwiICsgY29udGV4dC5tZXNzYWdlLnRleHQpO1xuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInN0YXJ0XCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJTaG93RW50aXR5XCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJzdGFydCBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwidHJhaW5cIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcInRyYWluXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwibGVhcm5cIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcImxlYXJuXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS50eXBlID0gXCJ0cmFpbkZhY3RcIjtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInRyYWluIFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJoZWxwXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJoZWxwXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiZXhpdFwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwiZXhpdFwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwid3JvbmdcIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcIndyb25nXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJ3JlY29nbml6aW5nIG5vdGhpbmcnKTtcbiAgICAgICAgdS5pbnRlbnQgPSBcIk5vbmVcIjtcbiAgICAgICAgdS5zY29yZSA9IDAuMTtcbiAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgZTEuc2NvcmUgPSAwLjE7XG4gICAgICAgIHUuZW50aXRpZXMgPSBbXTtcbiAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICB9O1xuICAgIHJldHVybiBTaW1wbGVSZWNvZ25pemVyO1xufSgpKTtcbnZhciBTaW1wbGVVcERvd25SZWNvZ25pemVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTaW1wbGVVcERvd25SZWNvZ25pemVyKCkge1xuICAgIH1cbiAgICBTaW1wbGVVcERvd25SZWNvZ25pemVyLnByb3RvdHlwZS5yZWNvZ25pemUgPSBmdW5jdGlvbiAoY29udGV4dCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHUgPSB7fTtcbiAgICAgICAgY29uc29sZS5sb2coXCJyZWNvZ25pemluZyBcIiArIGNvbnRleHQubWVzc2FnZS50ZXh0KTtcbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJkb3duXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJkb3duXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJzdGFydCBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwidXBcIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcInVwXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJ1cFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJ3JlY29nbml6aW5nIG5vdGhpbmcnKTtcbiAgICAgICAgdS5pbnRlbnQgPSBcIk5vbmVcIjtcbiAgICAgICAgdS5zY29yZSA9IDAuMTtcbiAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgZTEuc2NvcmUgPSAwLjE7XG4gICAgICAgIHUuZW50aXRpZXMgPSBbXTtcbiAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICB9O1xuICAgIHJldHVybiBTaW1wbGVVcERvd25SZWNvZ25pemVyO1xufSgpKTtcbnZhciBBbnlPYmplY3QgPSBPYmplY3Q7XG4vLyBnbG9iYWxUdW5uZWwuaW5pdGlhbGl6ZSh7XG4vLyAgaG9zdDogJ3Byb3h5LmV4eHhhbXBsZS5jb20nLFxuLy8gIHBvcnQ6IDgwODBcbi8vIH0pXG4vLyBDcmVhdGUgYm90IGFuZCBiaW5kIHRvIGNvbnNvbGVcbi8vIHZhciBjb25uZWN0b3IgPSBuZXcgaHRtbGNvbm5lY3Rvci5IVE1MQ29ubmVjdG9yKClcbi8vIGNvbm5lY3Rvci5zZXRBbnN3ZXJIb29rKGZ1bmN0aW9uIChzQW5zd2VyKSB7XG4vLyAgY29uc29sZS5sb2coJ0dvdCBhbnN3ZXIgOiAnICsgc0Fuc3dlciArICdcXG4nKVxuLy8gfSlcbnZhciBib3Q7XG4vLyBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbi8vICAgY29ubmVjdG9yLnByb2Nlc3NNZXNzYWdlKCdzdGFydCB1bml0IHRlc3QgQUJDICcpXG4vLyB9LCA1MDAwKVxuLyoqXG4gKiBDb25zdHJ1Y3QgYSBib3RcbiAqIEBwYXJhbSBjb25uZWN0b3Ige0Nvbm5lY3Rvcn0gdGhlIGNvbm5lY3RvciB0byB1c2VcbiAqIEhUTUxDb25uZWN0b3JcbiAqIG9yIGNvbm5lY3RvciA9IG5ldyBidWlsZGVyLkNvbnNvbGVDb25uZWN0b3IoKS5saXN0ZW4oKVxuICovXG5mdW5jdGlvbiBtYWtlQm90KGNvbm5lY3Rvcikge1xuICAgIGJvdCA9IG5ldyBidWlsZGVyLlVuaXZlcnNhbEJvdChjb25uZWN0b3IpO1xuICAgIC8vIENyZWF0ZSBMVUlTIHJlY29nbml6ZXIgdGhhdCBwb2ludHMgYXQgb3VyIG1vZGVsIGFuZCBhZGQgaXQgYXMgdGhlIHJvb3QgJy8nIGRpYWxvZyBmb3Igb3VyIENvcnRhbmEgQm90LlxuICAgIC8vIHZhciBtb2RlbCA9IHNlbnNpdGl2ZS5tb2RlbHVybDtcbiAgICAvLyB2YXIgbW9kZWwgPSAnaHR0cHM6Ly9hcGkucHJvamVjdG94Zm9yZC5haS9sdWlzL3YyLjAvYXBwcy9jNDEzYjJlZi0zODJjLTQ1YmQtOGZmMC1mNzZkNjBlMmE4MjE/c3Vic2NyaXB0aW9uLWtleT1jMjEzOThiNTk4MGE0Y2UwOWY0NzRiYmZlZTkzYjg5MiZxPSdcbiAgICB2YXIgcmVjb2duaXplciA9IG5ldyBTaW1wbGVSZWNvZ25pemVyKCk7IC8vIGJ1aWxkZXIuTHVpc1JlY29nbml6ZXIobW9kZWwpO1xuICAgIHZhciBkaWFsb2cgPSBuZXcgYnVpbGRlci5JbnRlbnREaWFsb2coeyByZWNvZ25pemVyczogW3JlY29nbml6ZXJdIH0pO1xuICAgIC8vIGRpYWxvZy5vbkJlZ2luKGZ1bmN0aW9uKHNlc3Npb24sYXJncykge1xuICAgIC8vIGNvbnNvbGUubG9nKFwiYmVnaW5uaW5nIC4uLlwiKVxuICAgIC8vIHNlc3Npb24uZGlhbG9nRGF0YS5yZXRyeVByb21wdCA9IGFyZ3MgJiYgYXJncy5yZXRyeVByb21wdCB8fCBcIkkgYW0gc29ycnlcIlxuICAgIC8vIHNlc3Npb24uc2VuZChcIldoYXQgZG8geW91IHdhbnQ/XCIpXG4gICAgLy9cbiAgICAvLyB9KVxuICAgIHZhciBkaWFsb2dVcERvd24gPSBuZXcgYnVpbGRlci5JbnRlbnREaWFsb2coeyByZWNvZ25pemVyczogW25ldyBTaW1wbGVVcERvd25SZWNvZ25pemVyKCldIH0pO1xuICAgIGJvdC5kaWFsb2coJy91cGRvd24nLCBkaWFsb2dVcERvd24pO1xuICAgIGRpYWxvZ1VwRG93bi5vbkJlZ2luKGZ1bmN0aW9uIChzZXNzaW9uKSB7XG4gICAgICAgIHNlc3Npb24uc2VuZChcIkhpIHRoZXJlLCB1cGRvd24gaXMgd2FpdGluZyBmb3IgeW91XCIpO1xuICAgIH0pO1xuICAgIGRpYWxvZ1VwRG93bi5tYXRjaGVzKCdpbnRlbnQudXAnLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICd5b3Ugd2FudCB0byBnbyB1cCcpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IHJlc3VsdHMucmVwb25zZTtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZW5kRGlhbG9nV2l0aFJlc3VsdCh7IHJlc3BvbnNlOiBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjIH0pO1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgZGlhbG9nVXBEb3duLm1hdGNoZXMoJ2ludGVudC5kb3duJywgW1xuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IGFyZ3MgfHwge307XG4gICAgICAgICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCAneW91IHdhbnQgdG8gZ28gZG93biEnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSAtMTsgLy8gcmVzdWx0cy5yZXBvbnNlO1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgICAgICAgc2Vzc2lvbi5lbmREaWFsb2dXaXRoUmVzdWx0KHtcbiAgICAgICAgICAgICAgICByZXNwb25zZTogeyByZXM6IFwiZG93blwiLCB1OiBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjIH0gfSk7XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBib3QuZGlhbG9nKCcvdHJhaW4nLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxnb0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdEbyB5b3Ugd2FudCB0byB0cmFpbiBtZScpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IHJlc3VsdHMucmVwb25zZTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZW5kRGlhbG9nV2l0aFJlc3VsdCh7IHJlc3BvbnNlOiBzZXNzaW9uLkRpYWxvZ0RhdGEuYWJjIH0pO1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgYm90LmRpYWxvZygnLycsIGRpYWxvZyk7XG4gICAgZGlhbG9nLm1hdGNoZXMoJ1Nob3dFbnRpdHknLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICB2YXIgaXNDb21iaW5lZEluZGV4ID0ge307XG4gICAgICAgICAgICB2YXIgb05ld0VudGl0eTtcbiAgICAgICAgICAgIC8vIGZ1c2UgZW50aXRpZXNcbiAgICAgICAgICAgIHZhciBjb21iaW5lZEVudGl0aWVzID0gYXJncy5lbnRpdGllcy5tYXAoZnVuY3Rpb24gKG9FbnRpdHksIGlJbmRleCkge1xuICAgICAgICAgICAgICAgIGlmIChpc0NvbWJpbmVkSW5kZXhbaUluZGV4XSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgaSA9IGlJbmRleCArIDE7XG4gICAgICAgICAgICAgICAgb05ld0VudGl0eSA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9FbnRpdHkpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChpIDwgYXJncy5lbnRpdGllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9OZXh0ID0gYXJncy5lbnRpdGllc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9OZXh0LnR5cGUgPT09IG9FbnRpdHkudHlwZSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgKG9OZXh0LnN0YXJ0SW5kZXggPT09IChvTmV3RW50aXR5LmVuZEluZGV4ICsgMSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvTmV4dC5zdGFydEluZGV4ID09PSAob05ld0VudGl0eS5lbmRJbmRleCArIDIpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNwYWNlZCA9IG9OZXh0LnN0YXJ0SW5kZXggPT09IChvTmV3RW50aXR5LmVuZEluZGV4ICsgMik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0NvbWJpbmVkSW5kZXhbaV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgb05ld0VudGl0eS5lbnRpdHkgPSBvTmV3RW50aXR5LmVudGl0eSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKHNwYWNlZCA/ICcgJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb05leHQuZW50aXR5O1xuICAgICAgICAgICAgICAgICAgICAgICAgb05ld0VudGl0eS5lbmRJbmRleCA9IG9OZXh0LmVuZEluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgaSA9IGkgKyAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaSA9IGFyZ3MuZW50aXRpZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSAvLyB3aGlsZVxuICAgICAgICAgICAgICAgIHJldHVybiBvTmV3RW50aXR5O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNob3cgRW50aXR5XCIpO1xuICAgICAgICAgICAgY29tYmluZWRFbnRpdGllcyA9IGNvbWJpbmVkRW50aXRpZXMuZmlsdGVyKGZ1bmN0aW9uIChvRW50aXR5KSB7IHJldHVybiBvRW50aXR5ICE9PSB1bmRlZmluZWQ7IH0pO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3JhdzogJyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpLCB1bmRlZmluZWQsIDIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2NvbWJpbmVkOiAnICsgSlNPTi5zdHJpbmdpZnkoY29tYmluZWRFbnRpdGllcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgdmFyIHN5c3RlbUlkID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ1N5c3RlbUlkJyk7XG4gICAgICAgICAgICAgICAgICB2YXIgY2xpZW50ID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ2NsaWVudCcpO1xuICAgICAgICAgICAgICAgICAgdmFyIHN5c3RlbU9iamVjdElkID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ3N5c3RlbU9iamVjdElkJykgfHxcbiAgICAgICAgICAgICAgICAgICAgYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ1N5c3RlbU9iamVjdCcpIHx8XG4gICAgICAgICAgICAgICAgICAgIGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGNvbWJpbmVkRW50aXRpZXMsICdidWlsdGluLm51bWJlcicpO1xuICAgICAgICAgICAgICAgICAgdmFyIHN5c3RlbU9iamVjdENhdGVnb3J5ID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ1N5c3RlbU9iamVjdENhdGVnb3J5Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5zeXN0ZW0gPSB7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbUlkOiBzeXN0ZW1JZCxcbiAgICAgICAgICAgICAgICAgICAgY2xpZW50OiBjbGllbnRcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgIHZhciBzU3lzdGVtSWQgPSBzeXN0ZW1JZCAmJiBzeXN0ZW1JZC5lbnRpdHk7XG4gICAgICAgICAgICAgICAgICB2YXIgc0NsaWVudCA9IGNsaWVudCAmJiBjbGllbnQuZW50aXR5O1xuICAgICAgICAgICAgICAgICAgdmFyIHNzeXN0ZW1PYmplY3RJZCA9IHN5c3RlbU9iamVjdElkICYmIHN5c3RlbU9iamVjdElkLmVudGl0eTtcbiAgICAgICAgICAgICAgICAgIHZhciBzU3lzdGVtT2JqZWN0Q2F0ZWdvcnkgPSBzeXN0ZW1PYmplY3RDYXRlZ29yeSAmJiBzeXN0ZW1PYmplY3RDYXRlZ29yeS5lbnRpdHk7XG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1Nob3cgZW50aXRpZXM6ICcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgIHNlc3Npb24uc2VuZCgnU2hvd2luZyBlbnRpdHkgLi4uJyk7XG4gICAgICAgICAgICAvLyAgY29uc29sZS5sb2coXCJzaG93IGVudGl0eSwgU2hvdyBzZXNzaW9uIDogXCIgKyBKU09OLnN0cmluZ2lmeShzZXNzaW9uKSlcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiU2hvdyBlbnRpdHkgOiBcIiArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpKVxuICAgICAgICB9XG4gICAgXSk7XG4gICAgZGlhbG9nLm1hdGNoZXMoJ3dyb25nJywgW1xuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5iZWdpbkRpYWxvZygnL3VwZG93bicsIHNlc3Npb24udXNlckRhdGEuY291bnQpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKFwiYmFjayBmcm9tIHdyb25nIDogXCIgKyBKU09OLnN0cmluZ2lmeShyZXN1bHRzKSk7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ2VuZCBvZiB3cm9uZycpO1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgZGlhbG9nLm1hdGNoZXMoJ2V4aXQnLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZXhpdCA6Jyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZXhpdCcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzKSk7XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICAvLyBBZGQgaW50ZW50IGhhbmRsZXJzXG4gICAgZGlhbG9nLm1hdGNoZXMoJ3RyYWluJywgW1xuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyYWluJyk7XG4gICAgICAgICAgICAvLyBSZXNvbHZlIGFuZCBzdG9yZSBhbnkgZW50aXRpZXMgcGFzc2VkIGZyb20gTFVJUy5cbiAgICAgICAgICAgIHZhciB0aXRsZSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdidWlsdGluLmFsYXJtLnRpdGxlJyk7XG4gICAgICAgICAgICB2YXIgdGltZSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5yZXNvbHZlVGltZShhcmdzLmVudGl0aWVzKTtcbiAgICAgICAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybSA9IHtcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGUgPyB0aXRsZS5lbnRpdHkgOiBudWxsLFxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogdGltZSA/IHRpbWUuZ2V0VGltZSgpIDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIFByb21wdCBmb3IgdGl0bGVcbiAgICAgICAgICAgIGlmICghYWxhcm0udGl0bGUpIHtcbiAgICAgICAgICAgICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCAnV2hhdCBmYWN0IHdvdWxkIHlvdSBsaWtlIHRvIHRyYWluPycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhbGFybS50aXRsZSA9IHJlc3VsdHMucmVzcG9uc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBQcm9tcHQgZm9yIHRpbWUgKHRpdGxlIHdpbGwgYmUgYmxhbmsgaWYgdGhlIHVzZXIgc2FpZCBjYW5jZWwpXG4gICAgICAgICAgICBpZiAoYWxhcm0udGl0bGUgJiYgIWFsYXJtLnRpbWVzdGFtcCkge1xuICAgICAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50aW1lKHNlc3Npb24sICdXaGF0IHRpbWUgd291bGQgeW91IGxpa2UgdG8gc2V0IHRoZSBhbGFybSBmb3I/Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICAgICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm07XG4gICAgICAgICAgICBpZiAocmVzdWx0cy5yZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHZhciB0aW1lID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLnJlc29sdmVUaW1lKFtyZXN1bHRzLnJlc3BvbnNlXSk7XG4gICAgICAgICAgICAgICAgYWxhcm0udGltZXN0YW1wID0gdGltZSA/IHRpbWUuZ2V0VGltZSgpIDogbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFNldCB0aGUgYWxhcm0gKGlmIHRpdGxlIG9yIHRpbWVzdGFtcCBpcyBibGFuayB0aGUgdXNlciBzYWlkIGNhbmNlbClcbiAgICAgICAgICAgIGlmIChhbGFybS50aXRsZSAmJiBhbGFybS50aW1lc3RhbXApIHtcbiAgICAgICAgICAgICAgICAvLyBTYXZlIGFkZHJlc3Mgb2Ygd2hvIHRvIG5vdGlmeSBhbmQgd3JpdGUgdG8gc2NoZWR1bGVyLlxuICAgICAgICAgICAgICAgIGFsYXJtLmFkZHJlc3MgPSBzZXNzaW9uLm1lc3NhZ2UuYWRkcmVzcztcbiAgICAgICAgICAgICAgICBhbGFybXNbYWxhcm0udGl0bGVdID0gYWxhcm07XG4gICAgICAgICAgICAgICAgLy8gU2VuZCBjb25maXJtYXRpb24gdG8gdXNlclxuICAgICAgICAgICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoYWxhcm0udGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICB2YXIgaXNBTSA9IGRhdGUuZ2V0SG91cnMoKSA8IDEyO1xuICAgICAgICAgICAgICAgIHNlc3Npb24uc2VuZCgnQ3JlYXRpbmcgYWxhcm0gbmFtZWQgXCIlc1wiIGZvciAlZC8lZC8lZCAlZDolMDJkJXMnLCBhbGFybS50aXRsZSwgZGF0ZS5nZXRNb250aCgpICsgMSwgZGF0ZS5nZXREYXRlKCksIGRhdGUuZ2V0RnVsbFllYXIoKSwgaXNBTSA/IGRhdGUuZ2V0SG91cnMoKSA6IGRhdGUuZ2V0SG91cnMoKSAtIDEyLCBkYXRlLmdldE1pbnV0ZXMoKSwgaXNBTSA/ICdhbScgOiAncG0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlc3Npb24uc2VuZCgnT2suLi4gbm8gcHJvYmxlbS4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIF0pO1xuICAgIGRpYWxvZy5vbkRlZmF1bHQoYnVpbGRlci5EaWFsb2dBY3Rpb24uc2VuZCgnSVxcJ20gc29ycnkgSSBkaWRuXFwndCB1bmRlcnN0YW5kLiBJIGNhbiBvbmx5IHNob3cgc3RhcnQgYW5kIHJpbmcnKSk7XG4gICAgLy8gVmVyeSBzaW1wbGUgYWxhcm0gc2NoZWR1bGVyXG4gICAgdmFyIGFsYXJtcyA9IHt9O1xuICAgIHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gYWxhcm1zKSB7XG4gICAgICAgICAgICB2YXIgYWxhcm0gPSBhbGFybXNba2V5XTtcbiAgICAgICAgICAgIGlmIChub3cgPj0gYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1zZyA9IG5ldyBidWlsZGVyLk1lc3NhZ2UoKVxuICAgICAgICAgICAgICAgICAgICAuYWRkcmVzcyhhbGFybS5hZGRyZXNzKVxuICAgICAgICAgICAgICAgICAgICAudGV4dCgnSGVyZVxcJ3MgeW91ciBcXCclc1xcJyBhbGFybS4nLCBhbGFybS50aXRsZSk7XG4gICAgICAgICAgICAgICAgYm90LnNlbmQobXNnKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgYWxhcm1zW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LCAxNTAwMCk7XG59XG5pZiAobW9kdWxlKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgIG1ha2VCb3Q6IG1ha2VCb3RcbiAgICB9O1xufVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
