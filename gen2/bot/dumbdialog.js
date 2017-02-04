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

var builder = require("botbuilder");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9ib3QvZHVtYmRpYWxvZy50cyIsImJvdC9kdW1iZGlhbG9nLmpzIl0sIm5hbWVzIjpbImJ1aWxkZXIiLCJyZXF1aXJlIiwiZGlzcGF0Y2hlciIsIlNpbXBsZVJlY29nbml6ZXIiLCJwcm90b3R5cGUiLCJyZWNvZ25pemUiLCJjb250ZXh0IiwiY2FsbGJhY2siLCJ1IiwiY29uc29sZSIsImxvZyIsIm1lc3NhZ2UiLCJ0ZXh0IiwiaW5kZXhPZiIsImludGVudCIsInNjb3JlIiwiZTEiLCJzdGFydEluZGV4IiwibGVuZ3RoIiwiZW5kSW5kZXgiLCJlbnRpdGllcyIsInVuZGVmaW5lZCIsInR5cGUiLCJTaW1wbGVVcERvd25SZWNvZ25pemVyIiwiQW55T2JqZWN0IiwiT2JqZWN0IiwiYm90IiwibWFrZUJvdCIsImNvbm5lY3RvciIsIlVuaXZlcnNhbEJvdCIsInJlY29nbml6ZXIiLCJkaWFsb2ciLCJJbnRlbnREaWFsb2ciLCJyZWNvZ25pemVycyIsImRpYWxvZ1VwRG93biIsIm9uQmVnaW4iLCJzZXNzaW9uIiwic2VuZCIsIm1hdGNoZXMiLCJhcmdzIiwibmV4dCIsImRpYWxvZ0RhdGEiLCJhYmMiLCJQcm9tcHRzIiwicmVzdWx0cyIsInJlcG9uc2UiLCJlbmREaWFsb2dXaXRoUmVzdWx0IiwicmVzcG9uc2UiLCJyZXMiLCJkaWFsZ29EYXRhIiwiRGlhbG9nRGF0YSIsImlzQ29tYmluZWRJbmRleCIsIm9OZXdFbnRpdHkiLCJjb21iaW5lZEVudGl0aWVzIiwibWFwIiwib0VudGl0eSIsImlJbmRleCIsImkiLCJhc3NpZ24iLCJvTmV4dCIsInNwYWNlZCIsImVudGl0eSIsImZpbHRlciIsIkpTT04iLCJzdHJpbmdpZnkiLCJiZWdpbkRpYWxvZyIsInVzZXJEYXRhIiwiY291bnQiLCJhbGFybSIsInRpdGxlIiwiRW50aXR5UmVjb2duaXplciIsImZpbmRFbnRpdHkiLCJ0aW1lIiwicmVzb2x2ZVRpbWUiLCJ0aW1lc3RhbXAiLCJnZXRUaW1lIiwiYWRkcmVzcyIsImFsYXJtcyIsImRhdGUiLCJEYXRlIiwiaXNBTSIsImdldEhvdXJzIiwiZ2V0TW9udGgiLCJnZXREYXRlIiwiZ2V0RnVsbFllYXIiLCJnZXRNaW51dGVzIiwib25EZWZhdWx0IiwiRGlhbG9nQWN0aW9uIiwic2V0SW50ZXJ2YWwiLCJub3ciLCJrZXkiLCJtc2ciLCJNZXNzYWdlIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7QUNPQTtBRENBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxJQUFBQSxVQUFBQyxRQUFBLFlBQUEsQ0FBQTtBQUNBO0FBRUEsSUFBSUMsYUFBYUQsUUFBUSx3QkFBUixFQUFrQ0MsVUFBbkQ7QUFHQSxJQUFBQyxtQkFBQSxZQUFBO0FBQ0UsYUFBQUEsZ0JBQUEsR0FBQSxDQUVDO0FBRURBLHFCQUFBQyxTQUFBLENBQUFDLFNBQUEsR0FBQSxVQUFVQyxPQUFWLEVBQThDQyxRQUE5QyxFQUFxSDtBQUNuSCxZQUFJQyxJQUFJLEVBQVI7QUFFQUMsZ0JBQVFDLEdBQVIsQ0FBWSxpQkFBaUJKLFFBQVFLLE9BQVIsQ0FBZ0JDLElBQTdDO0FBQ0EsWUFBSU4sUUFBUUssT0FBUixDQUFnQkMsSUFBaEIsQ0FBcUJDLE9BQXJCLENBQTZCLE9BQTdCLEtBQXlDLENBQTdDLEVBQWdEO0FBQzlDTCxjQUFFTSxNQUFGLEdBQVcsWUFBWDtBQUNBTixjQUFFTyxLQUFGLEdBQVUsR0FBVjtBQUNBLGdCQUFJQyxLQUFLLEVBQVQ7QUFDQUEsZUFBR0MsVUFBSCxHQUFnQixTQUFTQyxNQUF6QjtBQUNBRixlQUFHRyxRQUFILEdBQWNiLFFBQVFLLE9BQVIsQ0FBZ0JDLElBQWhCLENBQXFCTSxNQUFuQztBQUNBRixlQUFHRCxLQUFILEdBQVcsR0FBWDtBQUNBUCxjQUFFWSxRQUFGLEdBQWEsQ0FBQ0osRUFBRCxDQUFiO0FBQ0FULHFCQUFTYyxTQUFULEVBQW9CYixDQUFwQjtBQUNBO0FBQ0Q7QUFFRCxZQUFJRixRQUFRSyxPQUFSLENBQWdCQyxJQUFo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QWMsSUFIbEY7QUFJRCxTQVpELE1BWU87QUFDTDVDLG9CQUFRQyxJQUFSLENBQWEsbUJBQWI7QUFDRDtBQUNGLEtBcERxQixDQUF4QjtBQXVEQU4sV0FBT3VELFNBQVAsQ0FBaUJ0RixRQUFRdUYsWUFBUixDQUFxQmxELElBQXJCLENBQTBCLGlFQUExQixDQUFqQjtBQUVBO0FBQ0EsUUFBSXdDLFNBQVMsRUFBYjtBQUNBVyxnQkFBWSxZQUFBO0FBQ1YsWUFBSUMsTUFBTSxJQUFJVixJQUFKLEdBQVdKLE9BQVgsRUFBVjtBQUNBLGFBQUssSUFBSWUsR0FBVCxJQUFnQmIsTUFBaEIsRUFBd0I7QUFDdEIsZ0JBQUlULFFBQVFTLE9BQU9hLEdBQVAsQ0FBWjtBQUNBLGdCQUFJRCxPQUFPckIsTUFBTU0sU0FBakIsRUFBNEI7QUFDMUIsb0JBQUlpQixNQUFNLElBQUkzRixRQUFRNEYsT0FBWixHQUNQaEIsT0FETyxDQUNDUixNQUFNUSxPQURQLEVBRVBoRSxJQUZPLENBRUYsNEJBRkUsRUFFNEJ3RCxNQUFNQyxLQUZsQyxDQUFWO0FBR0EzQyxvQkFBSVcsSUFBSixDQUFTc0QsR0FBVDtBQUNBLHVCQUFPZCxPQUFPYSxHQUFQLENBQVA7QUFDRDtBQUNGO0FBQ0YsS0FaRCxFQVlHLEtBWkg7QUFhRDtBQUVELElBQUlHLE1BQUosRUFBWTtBQUNWQSxXQUFPQyxPQUFQLEdBQWlCO0FBQ2ZuRSxpQkFBU0E7QUFETSxLQUFqQjtBQUdEIiwiZmlsZSI6ImJvdC9kdW1iZGlhbG9nLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGUgYm90IGltcGxlbWVudGF0aW9uXG4gKlxuICogSW5zdGFudGlhdGUgYXBzc2luZyBhIGNvbm5lY3RvciB2aWFcbiAqIG1ha2VCb3RcbiAqXG4gKi9cblxuLy8gdmFyIGV4ZWMgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuZXhlY1xuXG4vLyB2YXIgcmVxdWVzdDIgPSByZXF1aXJlKCdyZXF1ZXN0LWRlZmF1bHRzJylcbi8vIHZhciByZXF1ZXN0ID0gcmVxdWVzdDIuZ2xvYmFsRGVmYXVsdHMoe1xuLy8gICdwcm94eSc6ICdodHRwOi8vcHJveHk6ODA4MCcsXG4vLyAgJ2h0dHBzLXByb3h5JzogJ2h0dHBzOi8vcHJveHk6ODA4MCdcbi8vIH0pXG5cbmltcG9ydCAqIGFzIGJ1aWxkZXIgZnJvbSAnYm90YnVpbGRlcic7XG4vL3ZhciBidWlsZGVyID0gcmVxdWlyZSgnYm90YnVpbGRlcicpO1xuXG52YXIgZGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL21hdGNoL2Rpc3BhdGNoZXIuanMnKS5kaXNwYXRjaGVyO1xuXG5cbmNsYXNzIFNpbXBsZVJlY29nbml6ZXIgaW1wbGVtZW50cyBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG5cbiAgfVxuXG4gIHJlY29nbml6ZShjb250ZXh0OiBidWlsZGVyLklSZWNvZ25pemVDb250ZXh0LCBjYWxsYmFjazogKGVycjogRXJyb3IsIHJlc3VsdDogYnVpbGRlci5JSW50ZW50UmVjb2duaXplclJlc3VsdCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHZhciB1ID0ge30gYXMgYnVpbGRlci5JSW50ZW50UmVjb2duaXplclJlc3VsdDtcblxuICAgIGNvbnNvbGUubG9nKFwicmVjb2duaXppbmcgXCIgKyBjb250ZXh0Lm1lc3NhZ2UudGV4dCk7XG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJzdGFydFwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwiU2hvd0VudGl0eVwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInN0YXJ0IFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJ0cmFpblwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwidHJhaW5cIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImxlYXJuXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJsZWFyblwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnR5cGUgPSBcInRyYWluRmFjdFwiO1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwidHJhaW4gXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJoZWxwXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJoZWxwXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwidHJhaW4gXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJleGl0XCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJleGl0XCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJ3cm9uZ1wiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwid3JvbmdcIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdyZWNvZ25pemluZyBub3RoaW5nJyk7XG4gICAgICB1LmludGVudCA9IFwiTm9uZVwiO1xuICAgICAgdS5zY29yZSA9IDAuMTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMTtcbiAgICAgIHUuZW50aXRpZXMgPSBbXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gIH1cbn1cblxuXG5jbGFzcyBTaW1wbGVVcERvd25SZWNvZ25pemVyIGltcGxlbWVudHMgYnVpbGRlci5JSW50ZW50UmVjb2duaXplciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuXG4gIH1cblxuICByZWNvZ25pemUoY29udGV4dDogYnVpbGRlci5JUmVjb2duaXplQ29udGV4dCwgY2FsbGJhY2s6IChlcnI6IEVycm9yLCByZXN1bHQ6IGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXJSZXN1bHQpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB2YXIgdSA9IHt9IGFzIGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXJSZXN1bHQ7XG5cbiAgICBjb25zb2xlLmxvZyhcInJlY29nbml6aW5nIFwiICsgY29udGV4dC5tZXNzYWdlLnRleHQpO1xuICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiZG93blwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwiZG93blwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInN0YXJ0IFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInVwXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJ1cFwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInVwXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ3JlY29nbml6aW5nIG5vdGhpbmcnKTtcbiAgICAgIHUuaW50ZW50ID0gXCJOb25lXCI7XG4gICAgICB1LnNjb3JlID0gMC4xO1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4xO1xuICAgICAgdS5lbnRpdGllcyA9IFtdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgfVxufVxuXG5jb25zdCBBbnlPYmplY3QgPSBPYmplY3QgYXMgYW55O1xuLy8gZ2xvYmFsVHVubmVsLmluaXRpYWxpemUoe1xuLy8gIGhvc3Q6ICdwcm94eS5leHh4YW1wbGUuY29tJyxcbi8vICBwb3J0OiA4MDgwXG4vLyB9KVxuXG4vLyBDcmVhdGUgYm90IGFuZCBiaW5kIHRvIGNvbnNvbGVcbi8vIHZhciBjb25uZWN0b3IgPSBuZXcgaHRtbGNvbm5lY3Rvci5IVE1MQ29ubmVjdG9yKClcblxuLy8gY29ubmVjdG9yLnNldEFuc3dlckhvb2soZnVuY3Rpb24gKHNBbnN3ZXIpIHtcbi8vICBjb25zb2xlLmxvZygnR290IGFuc3dlciA6ICcgKyBzQW5zd2VyICsgJ1xcbicpXG4vLyB9KVxuXG52YXIgYm90O1xuLy8gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4vLyAgIGNvbm5lY3Rvci5wcm9jZXNzTWVzc2FnZSgnc3RhcnQgdW5pdCB0ZXN0IEFCQyAnKVxuLy8gfSwgNTAwMClcblxuLyoqXG4gKiBDb25zdHJ1Y3QgYSBib3RcbiAqIEBwYXJhbSBjb25uZWN0b3Ige0Nvbm5lY3Rvcn0gdGhlIGNvbm5lY3RvciB0byB1c2VcbiAqIEhUTUxDb25uZWN0b3JcbiAqIG9yIGNvbm5lY3RvciA9IG5ldyBidWlsZGVyLkNvbnNvbGVDb25uZWN0b3IoKS5saXN0ZW4oKVxuICovXG5mdW5jdGlvbiBtYWtlQm90KGNvbm5lY3Rvcikge1xuICBib3QgPSBuZXcgYnVpbGRlci5Vbml2ZXJzYWxCb3QoY29ubmVjdG9yKTtcblxuICAvLyBDcmVhdGUgTFVJUyByZWNvZ25pemVyIHRoYXQgcG9pbnRzIGF0IG91ciBtb2RlbCBhbmQgYWRkIGl0IGFzIHRoZSByb290ICcvJyBkaWFsb2cgZm9yIG91ciBDb3J0YW5hIEJvdC5cbiAgLy8gdmFyIG1vZGVsID0gc2Vuc2l0aXZlLm1vZGVsdXJsO1xuICAvLyB2YXIgbW9kZWwgPSAnaHR0cHM6Ly9hcGkucHJvamVjdG94Zm9yZC5haS9sdWlzL3YyLjAvYXBwcy9jNDEzYjJlZi0zODJjLTQ1YmQtOGZmMC1mNzZkNjBlMmE4MjE/c3Vic2NyaXB0aW9uLWtleT1jMjEzOThiNTk4MGE0Y2UwOWY0NzRiYmZlZTkzYjg5MiZxPSdcbiAgdmFyIHJlY29nbml6ZXIgPSBuZXcgU2ltcGxlUmVjb2duaXplcigpOyAvLyBidWlsZGVyLkx1aXNSZWNvZ25pemVyKG1vZGVsKTtcblxuICB2YXIgZGlhbG9nID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFtyZWNvZ25pemVyXSB9KTtcbiAgLy8gZGlhbG9nLm9uQmVnaW4oZnVuY3Rpb24oc2Vzc2lvbixhcmdzKSB7XG4gIC8vIGNvbnNvbGUubG9nKFwiYmVnaW5uaW5nIC4uLlwiKVxuICAvLyBzZXNzaW9uLmRpYWxvZ0RhdGEucmV0cnlQcm9tcHQgPSBhcmdzICYmIGFyZ3MucmV0cnlQcm9tcHQgfHwgXCJJIGFtIHNvcnJ5XCJcbiAgLy8gc2Vzc2lvbi5zZW5kKFwiV2hhdCBkbyB5b3Ugd2FudD9cIilcbiAgLy9cbiAgLy8gfSlcblxuICB2YXIgZGlhbG9nVXBEb3duID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFsgbmV3IFNpbXBsZVVwRG93blJlY29nbml6ZXIoKV0gfSk7XG5cblxuICBib3QuZGlhbG9nKCcvdXBkb3duJywgZGlhbG9nVXBEb3duKTtcbiAgZGlhbG9nVXBEb3duLm9uQmVnaW4oZnVuY3Rpb24oc2Vzc2lvbikge1xuICAgIHNlc3Npb24uc2VuZChcIkhpIHRoZXJlLCB1cGRvd24gaXMgd2FpdGluZyBmb3IgeW91XCIpO1xuICB9KVxuXG4gIGRpYWxvZ1VwRG93bi5tYXRjaGVzKCdpbnRlbnQudXAnLCBbXG4gICAgZnVuY3Rpb24oc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IGFyZ3MgfHwge307XG4gICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCAneW91IHdhbnQgdG8gZ28gdXAnKTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gcmVzdWx0cy5yZXBvbnNlO1xuICAgICAgbmV4dCgpO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgIHNlc3Npb24uZW5kRGlhbG9nV2l0aFJlc3VsdCh7IHJlc3BvbnNlIDogc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyB9KTtcbiAgICB9XG4gIF1cbiAgKTtcblxuICBkaWFsb2dVcERvd24ubWF0Y2hlcygnaW50ZW50LmRvd24nLCBbXG4gICAgZnVuY3Rpb24oc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IGFyZ3MgfHwge307XG4gICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCAneW91IHdhbnQgdG8gZ28gZG93biEnKTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gLTE7IC8vIHJlc3VsdHMucmVwb25zZTtcbiAgICAgIG5leHQoKTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoe1xuICAgICAgIHJlc3BvbnNlIDogeyByZXMgOiBcImRvd25cIiAsIHUgOiBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjfSB9KTtcbiAgICB9XG4gIF1cbiAgKTtcblxuICBib3QuZGlhbG9nKCcvdHJhaW4nLCBbXG4gICAgZnVuY3Rpb24oc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsZ29EYXRhLmFiYyA9IGFyZ3MgfHwge307XG4gICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCAnRG8geW91IHdhbnQgdG8gdHJhaW4gbWUnKTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gcmVzdWx0cy5yZXBvbnNlO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgIHNlc3Npb24uZW5kRGlhbG9nV2l0aFJlc3VsdCh7IHJlc3BvbnNlIDogc2Vzc2lvbi5EaWFsb2dEYXRhLmFiYyB9KTtcbiAgICB9XG4gIF0pO1xuXG5cbiAgYm90LmRpYWxvZygnLycsIGRpYWxvZyk7XG5cbiAgZGlhbG9nLm1hdGNoZXMoJ1Nob3dFbnRpdHknLCBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIHZhciBpc0NvbWJpbmVkSW5kZXggPSB7fTtcbiAgICAgIHZhciBvTmV3RW50aXR5O1xuICAgICAgLy8gZnVzZSBlbnRpdGllc1xuICAgICAgdmFyIGNvbWJpbmVkRW50aXRpZXMgPSBhcmdzLmVudGl0aWVzLm1hcChmdW5jdGlvbiAob0VudGl0eSwgaUluZGV4KSB7XG4gICAgICAgIGlmIChpc0NvbWJpbmVkSW5kZXhbaUluZGV4XSkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGkgPSBpSW5kZXggKyAxO1xuICAgICAgICBvTmV3RW50aXR5ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb0VudGl0eSk7XG5cbiAgICAgICAgd2hpbGUgKGkgPCBhcmdzLmVudGl0aWVzLmxlbmd0aCkge1xuICAgICAgICAgIHZhciBvTmV4dCA9IGFyZ3MuZW50aXRpZXNbaV07XG4gICAgICAgICAgaWYgKG9OZXh0LnR5cGUgPT09IG9FbnRpdHkudHlwZSAmJlxuICAgICAgICAgICAgKG9OZXh0LnN0YXJ0SW5kZXggPT09IChvTmV3RW50aXR5LmVuZEluZGV4ICsgMSkgfHxcbiAgICAgICAgICAgICAgb05leHQuc3RhcnRJbmRleCA9PT0gKG9OZXdFbnRpdHkuZW5kSW5kZXggKyAyKVxuICAgICAgICAgICAgKSkge1xuICAgICAgICAgICAgdmFyIHNwYWNlZCA9IG9OZXh0LnN0YXJ0SW5kZXggPT09IChvTmV3RW50aXR5LmVuZEluZGV4ICsgMik7XG4gICAgICAgICAgICBpc0NvbWJpbmVkSW5kZXhbaV0gPSB0cnVlO1xuICAgICAgICAgICAgb05ld0VudGl0eS5lbnRpdHkgPSBvTmV3RW50aXR5LmVudGl0eSArXG4gICAgICAgICAgICAgIChzcGFjZWQgPyAnICcgOiAnJykgK1xuICAgICAgICAgICAgICBvTmV4dC5lbnRpdHk7XG4gICAgICAgICAgICBvTmV3RW50aXR5LmVuZEluZGV4ID0gb05leHQuZW5kSW5kZXg7XG4gICAgICAgICAgICBpID0gaSArIDE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGkgPSBhcmdzLmVudGl0aWVzLmxlbmd0aDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gLy8gd2hpbGVcbiAgICAgICAgcmV0dXJuIG9OZXdFbnRpdHk7XG4gICAgICB9KTtcbiAgICAgIGNvbnNvbGUubG9nKFwiU2hvdyBFbnRpdHlcIik7XG4gICAgICBjb21iaW5lZEVudGl0aWVzID0gY29tYmluZWRFbnRpdGllcy5maWx0ZXIoZnVuY3Rpb24gKG9FbnRpdHkpIHsgcmV0dXJuIG9FbnRpdHkgIT09IHVuZGVmaW5lZDsgfSk7XG4gICAgICBjb25zb2xlLmxvZygncmF3OiAnICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcyksIHVuZGVmaW5lZCwgMik7XG4gICAgICBjb25zb2xlLmxvZygnY29tYmluZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShjb21iaW5lZEVudGl0aWVzLCB1bmRlZmluZWQsIDIpKTtcbi8qXG4gICAgICB2YXIgc3lzdGVtSWQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnU3lzdGVtSWQnKTtcbiAgICAgIHZhciBjbGllbnQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnY2xpZW50Jyk7XG4gICAgICB2YXIgc3lzdGVtT2JqZWN0SWQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnc3lzdGVtT2JqZWN0SWQnKSB8fFxuICAgICAgICBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnU3lzdGVtT2JqZWN0JykgfHxcbiAgICAgICAgYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ2J1aWx0aW4ubnVtYmVyJyk7XG4gICAgICB2YXIgc3lzdGVtT2JqZWN0Q2F0ZWdvcnkgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnU3lzdGVtT2JqZWN0Q2F0ZWdvcnknKTtcblxuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnN5c3RlbSA9IHtcbiAgICAgICAgc3lzdGVtSWQ6IHN5c3RlbUlkLFxuICAgICAgICBjbGllbnQ6IGNsaWVudFxuICAgICAgfTtcbiovXG4vKlxuICAgICAgdmFyIHNTeXN0ZW1JZCA9IHN5c3RlbUlkICYmIHN5c3RlbUlkLmVudGl0eTtcbiAgICAgIHZhciBzQ2xpZW50ID0gY2xpZW50ICYmIGNsaWVudC5lbnRpdHk7XG4gICAgICB2YXIgc3N5c3RlbU9iamVjdElkID0gc3lzdGVtT2JqZWN0SWQgJiYgc3lzdGVtT2JqZWN0SWQuZW50aXR5O1xuICAgICAgdmFyIHNTeXN0ZW1PYmplY3RDYXRlZ29yeSA9IHN5c3RlbU9iamVjdENhdGVnb3J5ICYmIHN5c3RlbU9iamVjdENhdGVnb3J5LmVudGl0eTtcbiovXG4gICAgICBjb25zb2xlLmxvZygnU2hvdyBlbnRpdGllczogJyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMsIHVuZGVmaW5lZCwgMikpO1xuXG4gICAgICBzZXNzaW9uLnNlbmQoJ1Nob3dpbmcgZW50aXR5IC4uLicpO1xuICAgICAgLy8gIGNvbnNvbGUubG9nKFwic2hvdyBlbnRpdHksIFNob3cgc2Vzc2lvbiA6IFwiICsgSlNPTi5zdHJpbmdpZnkoc2Vzc2lvbikpXG4gICAgICAvLyBjb25zb2xlLmxvZyhcIlNob3cgZW50aXR5IDogXCIgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzKSlcbiAgICB9XG4gIF0pO1xuXG4gIGRpYWxvZy5tYXRjaGVzKCd3cm9uZycsICBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgc2Vzc2lvbi5iZWdpbkRpYWxvZygnL3VwZG93bicsIHNlc3Npb24udXNlckRhdGEuY291bnQgKTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm07XG4gICAgICBzZXNzaW9uLnNlbmQoXCJiYWNrIGZyb20gd3JvbmcgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJlc3VsdHMpKTtcbiAgICAgIG5leHQoKTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICAgIHNlc3Npb24uc2VuZCgnZW5kIG9mIHdyb25nJyk7XG4gICAgfVxuICBdKTtcblxuICBkaWFsb2cubWF0Y2hlcygnZXhpdCcsIFtcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgY29uc29sZS5sb2coJ2V4aXQgOicpO1xuICAgICAgY29uc29sZS5sb2coJ2V4aXQnICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcykpO1xuICAgIH1cbiAgXSk7XG5cbiAgLy8gQWRkIGludGVudCBoYW5kbGVyc1xuICBkaWFsb2cubWF0Y2hlcygndHJhaW4nLCBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCd0cmFpbicpO1xuICAgICAgLy8gUmVzb2x2ZSBhbmQgc3RvcmUgYW55IGVudGl0aWVzIHBhc3NlZCBmcm9tIExVSVMuXG4gICAgICB2YXIgdGl0bGUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnYnVpbHRpbi5hbGFybS50aXRsZScpO1xuICAgICAgdmFyIHRpbWUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIucmVzb2x2ZVRpbWUoYXJncy5lbnRpdGllcyk7XG4gICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm0gPSB7XG4gICAgICAgIHRpdGxlOiB0aXRsZSA/IHRpdGxlLmVudGl0eSA6IG51bGwsXG4gICAgICAgIHRpbWVzdGFtcDogdGltZSA/IHRpbWUuZ2V0VGltZSgpIDogbnVsbFxuICAgICAgfTtcbiAgICAgIC8vIFByb21wdCBmb3IgdGl0bGVcbiAgICAgIGlmICghYWxhcm0udGl0bGUpIHtcbiAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ1doYXQgZmFjdCB3b3VsZCB5b3UgbGlrZSB0byB0cmFpbj8nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm07XG4gICAgICBpZiAocmVzdWx0cy5yZXNwb25zZSkge1xuICAgICAgICBhbGFybS50aXRsZSA9IHJlc3VsdHMucmVzcG9uc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIFByb21wdCBmb3IgdGltZSAodGl0bGUgd2lsbCBiZSBibGFuayBpZiB0aGUgdXNlciBzYWlkIGNhbmNlbClcbiAgICAgIGlmIChhbGFybS50aXRsZSAmJiAhYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50aW1lKHNlc3Npb24sICdXaGF0IHRpbWUgd291bGQgeW91IGxpa2UgdG8gc2V0IHRoZSBhbGFybSBmb3I/Jyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgdmFyIHRpbWUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIucmVzb2x2ZVRpbWUoW3Jlc3VsdHMucmVzcG9uc2VdKTtcbiAgICAgICAgYWxhcm0udGltZXN0YW1wID0gdGltZSA/IHRpbWUuZ2V0VGltZSgpIDogbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIFNldCB0aGUgYWxhcm0gKGlmIHRpdGxlIG9yIHRpbWVzdGFtcCBpcyBibGFuayB0aGUgdXNlciBzYWlkIGNhbmNlbClcbiAgICAgIGlmIChhbGFybS50aXRsZSAmJiBhbGFybS50aW1lc3RhbXApIHtcbiAgICAgICAgLy8gU2F2ZSBhZGRyZXNzIG9mIHdobyB0byBub3RpZnkgYW5kIHdyaXRlIHRvIHNjaGVkdWxlci5cbiAgICAgICAgYWxhcm0uYWRkcmVzcyA9IHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzO1xuICAgICAgICBhbGFybXNbYWxhcm0udGl0bGVdID0gYWxhcm07XG5cbiAgICAgICAgLy8gU2VuZCBjb25maXJtYXRpb24gdG8gdXNlclxuICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKGFsYXJtLnRpbWVzdGFtcCk7XG4gICAgICAgIHZhciBpc0FNID0gZGF0ZS5nZXRIb3VycygpIDwgMTI7XG4gICAgICAgIHNlc3Npb24uc2VuZCgnQ3JlYXRpbmcgYWxhcm0gbmFtZWQgXCIlc1wiIGZvciAlZC8lZC8lZCAlZDolMDJkJXMnLFxuICAgICAgICAgIGFsYXJtLnRpdGxlLFxuICAgICAgICAgIGRhdGUuZ2V0TW9udGgoKSArIDEsIGRhdGUuZ2V0RGF0ZSgpLCBkYXRlLmdldEZ1bGxZZWFyKCksXG4gICAgICAgICAgaXNBTSA/IGRhdGUuZ2V0SG91cnMoKSA6IGRhdGUuZ2V0SG91cnMoKSAtIDEyLCBkYXRlLmdldE1pbnV0ZXMoKSwgaXNBTSA/ICdhbScgOiAncG0nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlc3Npb24uc2VuZCgnT2suLi4gbm8gcHJvYmxlbS4nKTtcbiAgICAgIH1cbiAgICB9XG4gIF0pO1xuXG4gIGRpYWxvZy5vbkRlZmF1bHQoYnVpbGRlci5EaWFsb2dBY3Rpb24uc2VuZCgnSVxcJ20gc29ycnkgSSBkaWRuXFwndCB1bmRlcnN0YW5kLiBJIGNhbiBvbmx5IHNob3cgc3RhcnQgYW5kIHJpbmcnKSk7XG5cbiAgLy8gVmVyeSBzaW1wbGUgYWxhcm0gc2NoZWR1bGVyXG4gIHZhciBhbGFybXMgPSB7fTtcbiAgc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICBmb3IgKHZhciBrZXkgaW4gYWxhcm1zKSB7XG4gICAgICB2YXIgYWxhcm0gPSBhbGFybXNba2V5XTtcbiAgICAgIGlmIChub3cgPj0gYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgIHZhciBtc2cgPSBuZXcgYnVpbGRlci5NZXNzYWdlKClcbiAgICAgICAgICAuYWRkcmVzcyhhbGFybS5hZGRyZXNzKVxuICAgICAgICAgIC50ZXh0KCdIZXJlXFwncyB5b3VyIFxcJyVzXFwnIGFsYXJtLicsIGFsYXJtLnRpdGxlKTtcbiAgICAgICAgYm90LnNlbmQobXNnKTtcbiAgICAgICAgZGVsZXRlIGFsYXJtc1trZXldO1xuICAgICAgfVxuICAgIH1cbiAgfSwgMTUwMDApO1xufVxuXG5pZiAobW9kdWxlKSB7XG4gIG1vZHVsZS5leHBvcnRzID0ge1xuICAgIG1ha2VCb3Q6IG1ha2VCb3RcbiAgfTtcbn1cbiIsIi8qKlxuICogVGhlIGJvdCBpbXBsZW1lbnRhdGlvblxuICpcbiAqIEluc3RhbnRpYXRlIGFwc3NpbmcgYSBjb25uZWN0b3IgdmlhXG4gKiBtYWtlQm90XG4gKlxuICovXG5cInVzZSBzdHJpY3RcIjtcbi8vIHZhciBleGVjID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNcbi8vIHZhciByZXF1ZXN0MiA9IHJlcXVpcmUoJ3JlcXVlc3QtZGVmYXVsdHMnKVxuLy8gdmFyIHJlcXVlc3QgPSByZXF1ZXN0Mi5nbG9iYWxEZWZhdWx0cyh7XG4vLyAgJ3Byb3h5JzogJ2h0dHA6Ly9wcm94eTo4MDgwJyxcbi8vICAnaHR0cHMtcHJveHknOiAnaHR0cHM6Ly9wcm94eTo4MDgwJ1xuLy8gfSlcbnZhciBidWlsZGVyID0gcmVxdWlyZShcImJvdGJ1aWxkZXJcIik7XG4vL3ZhciBidWlsZGVyID0gcmVxdWlyZSgnYm90YnVpbGRlcicpO1xudmFyIGRpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9tYXRjaC9kaXNwYXRjaGVyLmpzJykuZGlzcGF0Y2hlcjtcbnZhciBTaW1wbGVSZWNvZ25pemVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTaW1wbGVSZWNvZ25pemVyKCkge1xuICAgIH1cbiAgICBTaW1wbGVSZWNvZ25pemVyLnByb3RvdHlwZS5yZWNvZ25pemUgPSBmdW5jdGlvbiAoY29udGV4dCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHUgPSB7fTtcbiAgICAgICAgY29uc29sZS5sb2coXCJyZWNvZ25pemluZyBcIiArIGNvbnRleHQubWVzc2FnZS50ZXh0KTtcbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJzdGFydFwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwiU2hvd0VudGl0eVwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwic3RhcnQgXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInRyYWluXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJ0cmFpblwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwidHJhaW4gXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImxlYXJuXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJsZWFyblwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEudHlwZSA9IFwidHJhaW5GYWN0XCI7XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiaGVscFwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwiaGVscFwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwidHJhaW4gXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImV4aXRcIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcImV4aXRcIjtcbiAgICAgICAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcIndyb25nXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJ3cm9uZ1wiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdyZWNvZ25pemluZyBub3RoaW5nJyk7XG4gICAgICAgIHUuaW50ZW50ID0gXCJOb25lXCI7XG4gICAgICAgIHUuc2NvcmUgPSAwLjE7XG4gICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgIGUxLnNjb3JlID0gMC4xO1xuICAgICAgICB1LmVudGl0aWVzID0gW107XG4gICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgfTtcbiAgICByZXR1cm4gU2ltcGxlUmVjb2duaXplcjtcbn0oKSk7XG52YXIgU2ltcGxlVXBEb3duUmVjb2duaXplciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2ltcGxlVXBEb3duUmVjb2duaXplcigpIHtcbiAgICB9XG4gICAgU2ltcGxlVXBEb3duUmVjb2duaXplci5wcm90b3R5cGUucmVjb2duaXplID0gZnVuY3Rpb24gKGNvbnRleHQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciB1ID0ge307XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVjb2duaXppbmcgXCIgKyBjb250ZXh0Lm1lc3NhZ2UudGV4dCk7XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiZG93blwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwiZG93blwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwic3RhcnQgXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInVwXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJ1cFwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwidXBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdyZWNvZ25pemluZyBub3RoaW5nJyk7XG4gICAgICAgIHUuaW50ZW50ID0gXCJOb25lXCI7XG4gICAgICAgIHUuc2NvcmUgPSAwLjE7XG4gICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgIGUxLnNjb3JlID0gMC4xO1xuICAgICAgICB1LmVudGl0aWVzID0gW107XG4gICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgfTtcbiAgICByZXR1cm4gU2ltcGxlVXBEb3duUmVjb2duaXplcjtcbn0oKSk7XG52YXIgQW55T2JqZWN0ID0gT2JqZWN0O1xuLy8gZ2xvYmFsVHVubmVsLmluaXRpYWxpemUoe1xuLy8gIGhvc3Q6ICdwcm94eS5leHh4YW1wbGUuY29tJyxcbi8vICBwb3J0OiA4MDgwXG4vLyB9KVxuLy8gQ3JlYXRlIGJvdCBhbmQgYmluZCB0byBjb25zb2xlXG4vLyB2YXIgY29ubmVjdG9yID0gbmV3IGh0bWxjb25uZWN0b3IuSFRNTENvbm5lY3RvcigpXG4vLyBjb25uZWN0b3Iuc2V0QW5zd2VySG9vayhmdW5jdGlvbiAoc0Fuc3dlcikge1xuLy8gIGNvbnNvbGUubG9nKCdHb3QgYW5zd2VyIDogJyArIHNBbnN3ZXIgKyAnXFxuJylcbi8vIH0pXG52YXIgYm90O1xuLy8gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4vLyAgIGNvbm5lY3Rvci5wcm9jZXNzTWVzc2FnZSgnc3RhcnQgdW5pdCB0ZXN0IEFCQyAnKVxuLy8gfSwgNTAwMClcbi8qKlxuICogQ29uc3RydWN0IGEgYm90XG4gKiBAcGFyYW0gY29ubmVjdG9yIHtDb25uZWN0b3J9IHRoZSBjb25uZWN0b3IgdG8gdXNlXG4gKiBIVE1MQ29ubmVjdG9yXG4gKiBvciBjb25uZWN0b3IgPSBuZXcgYnVpbGRlci5Db25zb2xlQ29ubmVjdG9yKCkubGlzdGVuKClcbiAqL1xuZnVuY3Rpb24gbWFrZUJvdChjb25uZWN0b3IpIHtcbiAgICBib3QgPSBuZXcgYnVpbGRlci5Vbml2ZXJzYWxCb3QoY29ubmVjdG9yKTtcbiAgICAvLyBDcmVhdGUgTFVJUyByZWNvZ25pemVyIHRoYXQgcG9pbnRzIGF0IG91ciBtb2RlbCBhbmQgYWRkIGl0IGFzIHRoZSByb290ICcvJyBkaWFsb2cgZm9yIG91ciBDb3J0YW5hIEJvdC5cbiAgICAvLyB2YXIgbW9kZWwgPSBzZW5zaXRpdmUubW9kZWx1cmw7XG4gICAgLy8gdmFyIG1vZGVsID0gJ2h0dHBzOi8vYXBpLnByb2plY3RveGZvcmQuYWkvbHVpcy92Mi4wL2FwcHMvYzQxM2IyZWYtMzgyYy00NWJkLThmZjAtZjc2ZDYwZTJhODIxP3N1YnNjcmlwdGlvbi1rZXk9YzIxMzk4YjU5ODBhNGNlMDlmNDc0YmJmZWU5M2I4OTImcT0nXG4gICAgdmFyIHJlY29nbml6ZXIgPSBuZXcgU2ltcGxlUmVjb2duaXplcigpOyAvLyBidWlsZGVyLkx1aXNSZWNvZ25pemVyKG1vZGVsKTtcbiAgICB2YXIgZGlhbG9nID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFtyZWNvZ25pemVyXSB9KTtcbiAgICAvLyBkaWFsb2cub25CZWdpbihmdW5jdGlvbihzZXNzaW9uLGFyZ3MpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcImJlZ2lubmluZyAuLi5cIilcbiAgICAvLyBzZXNzaW9uLmRpYWxvZ0RhdGEucmV0cnlQcm9tcHQgPSBhcmdzICYmIGFyZ3MucmV0cnlQcm9tcHQgfHwgXCJJIGFtIHNvcnJ5XCJcbiAgICAvLyBzZXNzaW9uLnNlbmQoXCJXaGF0IGRvIHlvdSB3YW50P1wiKVxuICAgIC8vXG4gICAgLy8gfSlcbiAgICB2YXIgZGlhbG9nVXBEb3duID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFtuZXcgU2ltcGxlVXBEb3duUmVjb2duaXplcigpXSB9KTtcbiAgICBib3QuZGlhbG9nKCcvdXBkb3duJywgZGlhbG9nVXBEb3duKTtcbiAgICBkaWFsb2dVcERvd24ub25CZWdpbihmdW5jdGlvbiAoc2Vzc2lvbikge1xuICAgICAgICBzZXNzaW9uLnNlbmQoXCJIaSB0aGVyZSwgdXBkb3duIGlzIHdhaXRpbmcgZm9yIHlvdVwiKTtcbiAgICB9KTtcbiAgICBkaWFsb2dVcERvd24ubWF0Y2hlcygnaW50ZW50LnVwJywgW1xuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IGFyZ3MgfHwge307XG4gICAgICAgICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCAneW91IHdhbnQgdG8gZ28gdXAnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSByZXN1bHRzLnJlcG9uc2U7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoeyByZXNwb25zZTogc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyB9KTtcbiAgICAgICAgfVxuICAgIF0pO1xuICAgIGRpYWxvZ1VwRG93bi5tYXRjaGVzKCdpbnRlbnQuZG93bicsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ3lvdSB3YW50IHRvIGdvIGRvd24hJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gLTE7IC8vIHJlc3VsdHMucmVwb25zZTtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZW5kRGlhbG9nV2l0aFJlc3VsdCh7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2U6IHsgcmVzOiBcImRvd25cIiwgdTogc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIF0pO1xuICAgIGJvdC5kaWFsb2coJy90cmFpbicsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbGdvRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ0RvIHlvdSB3YW50IHRvIHRyYWluIG1lJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gcmVzdWx0cy5yZXBvbnNlO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgICAgICAgc2Vzc2lvbi5lbmREaWFsb2dXaXRoUmVzdWx0KHsgcmVzcG9uc2U6IHNlc3Npb24uRGlhbG9nRGF0YS5hYmMgfSk7XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBib3QuZGlhbG9nKCcvJywgZGlhbG9nKTtcbiAgICBkaWFsb2cubWF0Y2hlcygnU2hvd0VudGl0eScsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHZhciBpc0NvbWJpbmVkSW5kZXggPSB7fTtcbiAgICAgICAgICAgIHZhciBvTmV3RW50aXR5O1xuICAgICAgICAgICAgLy8gZnVzZSBlbnRpdGllc1xuICAgICAgICAgICAgdmFyIGNvbWJpbmVkRW50aXRpZXMgPSBhcmdzLmVudGl0aWVzLm1hcChmdW5jdGlvbiAob0VudGl0eSwgaUluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzQ29tYmluZWRJbmRleFtpSW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBpID0gaUluZGV4ICsgMTtcbiAgICAgICAgICAgICAgICBvTmV3RW50aXR5ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb0VudGl0eSk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGkgPCBhcmdzLmVudGl0aWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb05leHQgPSBhcmdzLmVudGl0aWVzW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAob05leHQudHlwZSA9PT0gb0VudGl0eS50eXBlICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAob05leHQuc3RhcnRJbmRleCA9PT0gKG9OZXdFbnRpdHkuZW5kSW5kZXggKyAxKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9OZXh0LnN0YXJ0SW5kZXggPT09IChvTmV3RW50aXR5LmVuZEluZGV4ICsgMikpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3BhY2VkID0gb05leHQuc3RhcnRJbmRleCA9PT0gKG9OZXdFbnRpdHkuZW5kSW5kZXggKyAyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tYmluZWRJbmRleFtpXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBvTmV3RW50aXR5LmVudGl0eSA9IG9OZXdFbnRpdHkuZW50aXR5ICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoc3BhY2VkID8gJyAnIDogJycpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvTmV4dC5lbnRpdHk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvTmV3RW50aXR5LmVuZEluZGV4ID0gb05leHQuZW5kSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICBpID0gaSArIDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpID0gYXJncy5lbnRpdGllcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IC8vIHdoaWxlXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9OZXdFbnRpdHk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU2hvdyBFbnRpdHlcIik7XG4gICAgICAgICAgICBjb21iaW5lZEVudGl0aWVzID0gY29tYmluZWRFbnRpdGllcy5maWx0ZXIoZnVuY3Rpb24gKG9FbnRpdHkpIHsgcmV0dXJuIG9FbnRpdHkgIT09IHVuZGVmaW5lZDsgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygncmF3OiAnICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcyksIHVuZGVmaW5lZCwgMik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29tYmluZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShjb21iaW5lZEVudGl0aWVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICB2YXIgc3lzdGVtSWQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnU3lzdGVtSWQnKTtcbiAgICAgICAgICAgICAgICAgIHZhciBjbGllbnQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnY2xpZW50Jyk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3lzdGVtT2JqZWN0SWQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnc3lzdGVtT2JqZWN0SWQnKSB8fFxuICAgICAgICAgICAgICAgICAgICBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnU3lzdGVtT2JqZWN0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ2J1aWx0aW4ubnVtYmVyJyk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3lzdGVtT2JqZWN0Q2F0ZWdvcnkgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnU3lzdGVtT2JqZWN0Q2F0ZWdvcnknKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnN5c3RlbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtSWQ6IHN5c3RlbUlkLFxuICAgICAgICAgICAgICAgICAgICBjbGllbnQ6IGNsaWVudFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgdmFyIHNTeXN0ZW1JZCA9IHN5c3RlbUlkICYmIHN5c3RlbUlkLmVudGl0eTtcbiAgICAgICAgICAgICAgICAgIHZhciBzQ2xpZW50ID0gY2xpZW50ICYmIGNsaWVudC5lbnRpdHk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3N5c3RlbU9iamVjdElkID0gc3lzdGVtT2JqZWN0SWQgJiYgc3lzdGVtT2JqZWN0SWQuZW50aXR5O1xuICAgICAgICAgICAgICAgICAgdmFyIHNTeXN0ZW1PYmplY3RDYXRlZ29yeSA9IHN5c3RlbU9iamVjdENhdGVnb3J5ICYmIHN5c3RlbU9iamVjdENhdGVnb3J5LmVudGl0eTtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2hvdyBlbnRpdGllczogJyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdTaG93aW5nIGVudGl0eSAuLi4nKTtcbiAgICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhcInNob3cgZW50aXR5LCBTaG93IHNlc3Npb24gOiBcIiArIEpTT04uc3RyaW5naWZ5KHNlc3Npb24pKVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJTaG93IGVudGl0eSA6IFwiICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcykpXG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBkaWFsb2cubWF0Y2hlcygnd3JvbmcnLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmJlZ2luRGlhbG9nKCcvdXBkb3duJywgc2Vzc2lvbi51c2VyRGF0YS5jb3VudCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm07XG4gICAgICAgICAgICBzZXNzaW9uLnNlbmQoXCJiYWNrIGZyb20gd3JvbmcgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJlc3VsdHMpKTtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHNlc3Npb24uc2VuZCgnZW5kIG9mIHdyb25nJyk7XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBkaWFsb2cubWF0Y2hlcygnZXhpdCcsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdleGl0IDonKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdleGl0JyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpKTtcbiAgICAgICAgfVxuICAgIF0pO1xuICAgIC8vIEFkZCBpbnRlbnQgaGFuZGxlcnNcbiAgICBkaWFsb2cubWF0Y2hlcygndHJhaW4nLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndHJhaW4nKTtcbiAgICAgICAgICAgIC8vIFJlc29sdmUgYW5kIHN0b3JlIGFueSBlbnRpdGllcyBwYXNzZWQgZnJvbSBMVUlTLlxuICAgICAgICAgICAgdmFyIHRpdGxlID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ2J1aWx0aW4uYWxhcm0udGl0bGUnKTtcbiAgICAgICAgICAgIHZhciB0aW1lID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLnJlc29sdmVUaW1lKGFyZ3MuZW50aXRpZXMpO1xuICAgICAgICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtID0ge1xuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSA/IHRpdGxlLmVudGl0eSA6IG51bGwsXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiB0aW1lID8gdGltZS5nZXRUaW1lKCkgOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gUHJvbXB0IGZvciB0aXRsZVxuICAgICAgICAgICAgaWYgKCFhbGFybS50aXRsZSkge1xuICAgICAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdXaGF0IGZhY3Qgd291bGQgeW91IGxpa2UgdG8gdHJhaW4/Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm07XG4gICAgICAgICAgICBpZiAocmVzdWx0cy5yZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGFsYXJtLnRpdGxlID0gcmVzdWx0cy5yZXNwb25zZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFByb21wdCBmb3IgdGltZSAodGl0bGUgd2lsbCBiZSBibGFuayBpZiB0aGUgdXNlciBzYWlkIGNhbmNlbClcbiAgICAgICAgICAgIGlmIChhbGFybS50aXRsZSAmJiAhYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRpbWUoc2Vzc2lvbiwgJ1doYXQgdGltZSB3b3VsZCB5b3UgbGlrZSB0byBzZXQgdGhlIGFsYXJtIGZvcj8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLnJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIucmVzb2x2ZVRpbWUoW3Jlc3VsdHMucmVzcG9uc2VdKTtcbiAgICAgICAgICAgICAgICBhbGFybS50aW1lc3RhbXAgPSB0aW1lID8gdGltZS5nZXRUaW1lKCkgOiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU2V0IHRoZSBhbGFybSAoaWYgdGl0bGUgb3IgdGltZXN0YW1wIGlzIGJsYW5rIHRoZSB1c2VyIHNhaWQgY2FuY2VsKVxuICAgICAgICAgICAgaWYgKGFsYXJtLnRpdGxlICYmIGFsYXJtLnRpbWVzdGFtcCkge1xuICAgICAgICAgICAgICAgIC8vIFNhdmUgYWRkcmVzcyBvZiB3aG8gdG8gbm90aWZ5IGFuZCB3cml0ZSB0byBzY2hlZHVsZXIuXG4gICAgICAgICAgICAgICAgYWxhcm0uYWRkcmVzcyA9IHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzO1xuICAgICAgICAgICAgICAgIGFsYXJtc1thbGFybS50aXRsZV0gPSBhbGFybTtcbiAgICAgICAgICAgICAgICAvLyBTZW5kIGNvbmZpcm1hdGlvbiB0byB1c2VyXG4gICAgICAgICAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShhbGFybS50aW1lc3RhbXApO1xuICAgICAgICAgICAgICAgIHZhciBpc0FNID0gZGF0ZS5nZXRIb3VycygpIDwgMTI7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdDcmVhdGluZyBhbGFybSBuYW1lZCBcIiVzXCIgZm9yICVkLyVkLyVkICVkOiUwMmQlcycsIGFsYXJtLnRpdGxlLCBkYXRlLmdldE1vbnRoKCkgKyAxLCBkYXRlLmdldERhdGUoKSwgZGF0ZS5nZXRGdWxsWWVhcigpLCBpc0FNID8gZGF0ZS5nZXRIb3VycygpIDogZGF0ZS5nZXRIb3VycygpIC0gMTIsIGRhdGUuZ2V0TWludXRlcygpLCBpc0FNID8gJ2FtJyA6ICdwbScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdPay4uLiBubyBwcm9ibGVtLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgXSk7XG4gICAgZGlhbG9nLm9uRGVmYXVsdChidWlsZGVyLkRpYWxvZ0FjdGlvbi5zZW5kKCdJXFwnbSBzb3JyeSBJIGRpZG5cXCd0IHVuZGVyc3RhbmQuIEkgY2FuIG9ubHkgc2hvdyBzdGFydCBhbmQgcmluZycpKTtcbiAgICAvLyBWZXJ5IHNpbXBsZSBhbGFybSBzY2hlZHVsZXJcbiAgICB2YXIgYWxhcm1zID0ge307XG4gICAgc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBhbGFybXMpIHtcbiAgICAgICAgICAgIHZhciBhbGFybSA9IGFsYXJtc1trZXldO1xuICAgICAgICAgICAgaWYgKG5vdyA+PSBhbGFybS50aW1lc3RhbXApIHtcbiAgICAgICAgICAgICAgICB2YXIgbXNnID0gbmV3IGJ1aWxkZXIuTWVzc2FnZSgpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRyZXNzKGFsYXJtLmFkZHJlc3MpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KCdIZXJlXFwncyB5b3VyIFxcJyVzXFwnIGFsYXJtLicsIGFsYXJtLnRpdGxlKTtcbiAgICAgICAgICAgICAgICBib3Quc2VuZChtc2cpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBhbGFybXNba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sIDE1MDAwKTtcbn1cbmlmIChtb2R1bGUpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAgICAgbWFrZUJvdDogbWFrZUJvdFxuICAgIH07XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
