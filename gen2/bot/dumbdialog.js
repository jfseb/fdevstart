"use strict";
/**
 * The bot implementation
 *
 * Instantiate apssing a connector via
 * makeBot
 *
 */

Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJvdC9kdW1iZGlhbG9nLmpzIiwiLi4vc3JjL2JvdC9kdW1iZGlhbG9nLnRzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiYnVpbGRlciIsInJlcXVpcmUiLCJkaXNwYXRjaGVyIiwiU2ltcGxlUmVjb2duaXplciIsInByb3RvdHlwZSIsInJlY29nbml6ZSIsImNvbnRleHQiLCJjYWxsYmFjayIsInUiLCJjb25zb2xlIiwibG9nIiwibWVzc2FnZSIsInRleHQiLCJpbmRleE9mIiwiaW50ZW50Iiwic2NvcmUiLCJlMSIsInN0YXJ0SW5kZXgiLCJsZW5ndGgiLCJlbmRJbmRleCIsImVudGl0aWVzIiwidW5kZWZpbmVkIiwidHlwZSIsIlNpbXBsZVVwRG93blJlY29nbml6ZXIiLCJBbnlPYmplY3QiLCJib3QiLCJtYWtlQm90IiwiY29ubmVjdG9yIiwiVW5pdmVyc2FsQm90IiwicmVjb2duaXplciIsImRpYWxvZyIsIkludGVudERpYWxvZyIsInJlY29nbml6ZXJzIiwiZGlhbG9nVXBEb3duIiwib25CZWdpbiIsInNlc3Npb24iLCJzZW5kIiwibWF0Y2hlcyIsImFyZ3MiLCJuZXh0IiwiZGlhbG9nRGF0YSIsImFiYyIsIlByb21wdHMiLCJyZXN1bHRzIiwicmVwb25zZSIsImVuZERpYWxvZ1dpdGhSZXN1bHQiLCJyZXNwb25zZSIsInJlcyIsImRpYWxnb0RhdGEiLCJEaWFsb2dEYXRhIiwiaXNDb21iaW5lZEluZGV4Iiwib05ld0VudGl0eSIsImNvbWJpbmVkRW50aXRpZXMiLCJtYXAiLCJvRW50aXR5IiwiaUluZGV4IiwiaSIsImFzc2lnbiIsIm9OZXh0Iiwic3BhY2VkIiwiZW50aXR5IiwiZmlsdGVyIiwiSlNPTiIsInN0cmluZ2lmeSIsImJlZ2luRGlhbG9nIiwidXNlckRhdGEiLCJjb3VudCIsImFsYXJtIiwidGl0bGUiLCJFbnRpdHlSZWNvZ25pemVyIiwiZmluZEVudGl0eSIsInRpbWUiLCJyZXNvbHZlVGltZSIsInRpbWVzdGFtcCIsImdldFRpbWUiLCJhZGRyZXNzIiwiYWxhcm1zIiwiZGF0ZSIsIkRhdGUiLCJpc0FNIiwiZ2V0SG91cnMiLCJnZXRNb250aCIsImdldERhdGUiLCJnZXRGdWxsWWVhciIsImdldE1pbnV0ZXMiLCJvbkRlZmF1bHQiLCJEaWFsb2dBY3Rpb24iLCJzZXRJbnRlcnZhbCIsIm5vdyIsImtleSIsIm1zZyIsIk1lc3NhZ2UiLCJtb2R1bGUiXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7Ozs7Ozs7O0FEUUFBLE9BQU9DLGNBQVAsQ0FBc0JDLE9BQXRCLEVBQStCLFlBQS9CLEVBQTZDLEVBQUVDLE9BQU8sSUFBVCxFQUE3QztBQ0FBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBLElBQUFDLFVBQUFDLFFBQUEsWUFBQSxDQUFBO0FBQ0E7QUFFQSxJQUFJQyxhQUFhRCxRQUFRLHdCQUFSLEVBQWtDQyxVQUFuRDtBQUdBLElBQUFDLG1CQUFBLFlBQUE7QUFDRSxhQUFBQSxnQkFBQSxHQUFBLENBRUM7QUFFREEscUJBQUFDLFNBQUEsQ0FBQUMsU0FBQSxHQUFBLFVBQVVDLE9BQVYsRUFBOENDLFFBQTlDLEVBQXFIO0FBQ25ILFlBQUlDLElBQUksRUFBUjtBQUVBQyxnQkFBUUMsR0FBUixDQUFZLGlCQUFpQkosUUFBUUssT0FBUixDQUFnQkMsSUFBN0M7QUFDQSxZQUFJTixRQUFRSyxPQUFSLENBQWdCQyxJQUFoQixDQUFxQkMsT0FBckIsQ0FBNkIsT0FBN0IsS0FBeUMsQ0FBN0MsRUFBZ0Q7QUFDOUNMLGNBQUVNLE1BQUYsR0FBVyxZQUFYO0FBQ0FOLGNBQUVPLEtBQUYsR0FBVSxHQUFWO0FBQ0EsZ0JBQUlDLEtBQUssRUFBVDtBQUNBQSxlQUFHQyxVQUFILEdBQWdCLFNBQVNDLE1BQXpCO0FBQ0FGLGVBQUdHLFFBQUgsR0FBY2IsUUFBUUssT0FBUixDQUFnQkMsSUFBaEIsQ0FBcUJNLE1BQW5DO0FBQ0FGLGVBQUdELEtBQUgsR0FBVyxHQUFYO0FBQ0FQLGNBQUVZLFFBQUYs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SixPQUFPRixLQUFLRyxRQUFMLEVBQVAsR0FBeUJILEtBQUtHLFFBQUwsS0FBa0IsRUFIN0MsRUFHaURILEtBQUtPLFVBQUwsRUFIakQsRUFHb0VMLE9BQU8sSUFBUCxHQUFjLElBSGxGO0FBSUQsU0FaRCxNQVlPO0FBQ0w1QyxvQkFBUUMsSUFBUixDQUFhLG1CQUFiO0FBQ0Q7QUFDRixLQXBEcUIsQ0FBeEI7QUF1REFOLFdBQU91RCxTQUFQLENBQWlCckYsUUFBUXNGLFlBQVIsQ0FBcUJsRCxJQUFyQixDQUEwQixpRUFBMUIsQ0FBakI7QUFFQTtBQUNBLFFBQUl3QyxTQUFTLEVBQWI7QUFDQVcsZ0JBQVksWUFBQTtBQUNWLFlBQUlDLE1BQU0sSUFBSVYsSUFBSixHQUFXSixPQUFYLEVBQVY7QUFDQSxhQUFLLElBQUllLEdBQVQsSUFBZ0JiLE1BQWhCLEVBQXdCO0FBQ3RCLGdCQUFJVCxRQUFRUyxPQUFPYSxHQUFQLENBQVo7QUFDQSxnQkFBSUQsT0FBT3JCLE1BQU1NLFNBQWpCLEVBQTRCO0FBQzFCLG9CQUFJaUIsTUFBTSxJQUFJMUYsUUFBUTJGLE9BQVosR0FDUGhCLE9BRE8sQ0FDQ1IsTUFBTVEsT0FEUCxFQUVQL0QsSUFGTyxDQUVGLDRCQUZFLEVBRTRCdUQsTUFBTUMsS0FGbEMsQ0FBVjtBQUdBM0Msb0JBQUlXLElBQUosQ0FBU3NELEdBQVQ7QUFDQSx1QkFBT2QsT0FBT2EsR0FBUCxDQUFQO0FBQ0Q7QUFDRjtBQUNGLEtBWkQsRUFZRyxLQVpIO0FBYUQ7QUFFRCxJQUFJRyxNQUFKLEVBQVk7QUFDVkEsV0FBTzlGLE9BQVAsR0FBaUI7QUFDZjRCLGlCQUFTQTtBQURNLEtBQWpCO0FBR0QiLCJmaWxlIjoiYm90L2R1bWJkaWFsb2cuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbi8qKlxuICogVGhlIGJvdCBpbXBsZW1lbnRhdGlvblxuICpcbiAqIEluc3RhbnRpYXRlIGFwc3NpbmcgYSBjb25uZWN0b3IgdmlhXG4gKiBtYWtlQm90XG4gKlxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG4vLyB2YXIgZXhlYyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5leGVjXG4vLyB2YXIgcmVxdWVzdDIgPSByZXF1aXJlKCdyZXF1ZXN0LWRlZmF1bHRzJylcbi8vIHZhciByZXF1ZXN0ID0gcmVxdWVzdDIuZ2xvYmFsRGVmYXVsdHMoe1xuLy8gICdwcm94eSc6ICdodHRwOi8vcHJveHk6ODA4MCcsXG4vLyAgJ2h0dHBzLXByb3h5JzogJ2h0dHBzOi8vcHJveHk6ODA4MCdcbi8vIH0pXG52YXIgYnVpbGRlciA9IHJlcXVpcmUoXCJib3RidWlsZGVyXCIpO1xuLy92YXIgYnVpbGRlciA9IHJlcXVpcmUoJ2JvdGJ1aWxkZXInKTtcbnZhciBkaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vbWF0Y2gvZGlzcGF0Y2hlci5qcycpLmRpc3BhdGNoZXI7XG52YXIgU2ltcGxlUmVjb2duaXplciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2ltcGxlUmVjb2duaXplcigpIHtcbiAgICB9XG4gICAgU2ltcGxlUmVjb2duaXplci5wcm90b3R5cGUucmVjb2duaXplID0gZnVuY3Rpb24gKGNvbnRleHQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciB1ID0ge307XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVjb2duaXppbmcgXCIgKyBjb250ZXh0Lm1lc3NhZ2UudGV4dCk7XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwic3RhcnRcIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcIlNob3dFbnRpdHlcIjtcbiAgICAgICAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInN0YXJ0IFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJ0cmFpblwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwidHJhaW5cIjtcbiAgICAgICAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInRyYWluIFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJsZWFyblwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwibGVhcm5cIjtcbiAgICAgICAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgICAgIGUxLnR5cGUgPSBcInRyYWluRmFjdFwiO1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwidHJhaW4gXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImhlbHBcIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcImhlbHBcIjtcbiAgICAgICAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInRyYWluIFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJleGl0XCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJleGl0XCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJ3cm9uZ1wiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwid3JvbmdcIjtcbiAgICAgICAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygncmVjb2duaXppbmcgbm90aGluZycpO1xuICAgICAgICB1LmludGVudCA9IFwiTm9uZVwiO1xuICAgICAgICB1LnNjb3JlID0gMC4xO1xuICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICBlMS5zY29yZSA9IDAuMTtcbiAgICAgICAgdS5lbnRpdGllcyA9IFtdO1xuICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgIH07XG4gICAgcmV0dXJuIFNpbXBsZVJlY29nbml6ZXI7XG59KCkpO1xudmFyIFNpbXBsZVVwRG93blJlY29nbml6ZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFNpbXBsZVVwRG93blJlY29nbml6ZXIoKSB7XG4gICAgfVxuICAgIFNpbXBsZVVwRG93blJlY29nbml6ZXIucHJvdG90eXBlLnJlY29nbml6ZSA9IGZ1bmN0aW9uIChjb250ZXh0LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgdSA9IHt9O1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlY29nbml6aW5nIFwiICsgY29udGV4dC5tZXNzYWdlLnRleHQpO1xuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImRvd25cIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcImRvd25cIjtcbiAgICAgICAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInN0YXJ0IFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJ1cFwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwidXBcIjtcbiAgICAgICAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInVwXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygncmVjb2duaXppbmcgbm90aGluZycpO1xuICAgICAgICB1LmludGVudCA9IFwiTm9uZVwiO1xuICAgICAgICB1LnNjb3JlID0gMC4xO1xuICAgICAgICB2YXIgZTEgPSB7fTtcbiAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICBlMS5zY29yZSA9IDAuMTtcbiAgICAgICAgdS5lbnRpdGllcyA9IFtdO1xuICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgIH07XG4gICAgcmV0dXJuIFNpbXBsZVVwRG93blJlY29nbml6ZXI7XG59KCkpO1xudmFyIEFueU9iamVjdCA9IE9iamVjdDtcbi8vIGdsb2JhbFR1bm5lbC5pbml0aWFsaXplKHtcbi8vICBob3N0OiAncHJveHkuZXh4eGFtcGxlLmNvbScsXG4vLyAgcG9ydDogODA4MFxuLy8gfSlcbi8vIENyZWF0ZSBib3QgYW5kIGJpbmQgdG8gY29uc29sZVxuLy8gdmFyIGNvbm5lY3RvciA9IG5ldyBodG1sY29ubmVjdG9yLkhUTUxDb25uZWN0b3IoKVxuLy8gY29ubmVjdG9yLnNldEFuc3dlckhvb2soZnVuY3Rpb24gKHNBbnN3ZXIpIHtcbi8vICBjb25zb2xlLmxvZygnR290IGFuc3dlciA6ICcgKyBzQW5zd2VyICsgJ1xcbicpXG4vLyB9KVxudmFyIGJvdDtcbi8vIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuLy8gICBjb25uZWN0b3IucHJvY2Vzc01lc3NhZ2UoJ3N0YXJ0IHVuaXQgdGVzdCBBQkMgJylcbi8vIH0sIDUwMDApXG4vKipcbiAqIENvbnN0cnVjdCBhIGJvdFxuICogQHBhcmFtIGNvbm5lY3RvciB7Q29ubmVjdG9yfSB0aGUgY29ubmVjdG9yIHRvIHVzZVxuICogSFRNTENvbm5lY3RvclxuICogb3IgY29ubmVjdG9yID0gbmV3IGJ1aWxkZXIuQ29uc29sZUNvbm5lY3RvcigpLmxpc3RlbigpXG4gKi9cbmZ1bmN0aW9uIG1ha2VCb3QoY29ubmVjdG9yKSB7XG4gICAgYm90ID0gbmV3IGJ1aWxkZXIuVW5pdmVyc2FsQm90KGNvbm5lY3Rvcik7XG4gICAgLy8gQ3JlYXRlIExVSVMgcmVjb2duaXplciB0aGF0IHBvaW50cyBhdCBvdXIgbW9kZWwgYW5kIGFkZCBpdCBhcyB0aGUgcm9vdCAnLycgZGlhbG9nIGZvciBvdXIgQ29ydGFuYSBCb3QuXG4gICAgLy8gdmFyIG1vZGVsID0gc2Vuc2l0aXZlLm1vZGVsdXJsO1xuICAgIC8vIHZhciBtb2RlbCA9ICdodHRwczovL2FwaS5wcm9qZWN0b3hmb3JkLmFpL2x1aXMvdjIuMC9hcHBzL2M0MTNiMmVmLTM4MmMtNDViZC04ZmYwLWY3NmQ2MGUyYTgyMT9zdWJzY3JpcHRpb24ta2V5PWMyMTM5OGI1OTgwYTRjZTA5ZjQ3NGJiZmVlOTNiODkyJnE9J1xuICAgIHZhciByZWNvZ25pemVyID0gbmV3IFNpbXBsZVJlY29nbml6ZXIoKTsgLy8gYnVpbGRlci5MdWlzUmVjb2duaXplcihtb2RlbCk7XG4gICAgdmFyIGRpYWxvZyA9IG5ldyBidWlsZGVyLkludGVudERpYWxvZyh7IHJlY29nbml6ZXJzOiBbcmVjb2duaXplcl0gfSk7XG4gICAgLy8gZGlhbG9nLm9uQmVnaW4oZnVuY3Rpb24oc2Vzc2lvbixhcmdzKSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJiZWdpbm5pbmcgLi4uXCIpXG4gICAgLy8gc2Vzc2lvbi5kaWFsb2dEYXRhLnJldHJ5UHJvbXB0ID0gYXJncyAmJiBhcmdzLnJldHJ5UHJvbXB0IHx8IFwiSSBhbSBzb3JyeVwiXG4gICAgLy8gc2Vzc2lvbi5zZW5kKFwiV2hhdCBkbyB5b3Ugd2FudD9cIilcbiAgICAvL1xuICAgIC8vIH0pXG4gICAgdmFyIGRpYWxvZ1VwRG93biA9IG5ldyBidWlsZGVyLkludGVudERpYWxvZyh7IHJlY29nbml6ZXJzOiBbbmV3IFNpbXBsZVVwRG93blJlY29nbml6ZXIoKV0gfSk7XG4gICAgYm90LmRpYWxvZygnL3VwZG93bicsIGRpYWxvZ1VwRG93bik7XG4gICAgZGlhbG9nVXBEb3duLm9uQmVnaW4oZnVuY3Rpb24gKHNlc3Npb24pIHtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKFwiSGkgdGhlcmUsIHVwZG93biBpcyB3YWl0aW5nIGZvciB5b3VcIik7XG4gICAgfSk7XG4gICAgZGlhbG9nVXBEb3duLm1hdGNoZXMoJ2ludGVudC51cCcsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ3lvdSB3YW50IHRvIGdvIHVwJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gcmVzdWx0cy5yZXBvbnNlO1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgICAgICAgc2Vzc2lvbi5lbmREaWFsb2dXaXRoUmVzdWx0KHsgcmVzcG9uc2U6IHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgfSk7XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBkaWFsb2dVcERvd24ubWF0Y2hlcygnaW50ZW50LmRvd24nLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICd5b3Ugd2FudCB0byBnbyBkb3duIScpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IC0xOyAvLyByZXN1bHRzLnJlcG9uc2U7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoe1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlOiB7IHJlczogXCJkb3duXCIsIHU6IHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBib3QuZGlhbG9nKCcvdHJhaW4nLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxnb0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdEbyB5b3Ugd2FudCB0byB0cmFpbiBtZScpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IHJlc3VsdHMucmVwb25zZTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZW5kRGlhbG9nV2l0aFJlc3VsdCh7IHJlc3BvbnNlOiBzZXNzaW9uLkRpYWxvZ0RhdGEuYWJjIH0pO1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgYm90LmRpYWxvZygnLycsIGRpYWxvZyk7XG4gICAgZGlhbG9nLm1hdGNoZXMoJ1Nob3dFbnRpdHknLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICB2YXIgaXNDb21iaW5lZEluZGV4ID0ge307XG4gICAgICAgICAgICB2YXIgb05ld0VudGl0eTtcbiAgICAgICAgICAgIC8vIGZ1c2UgZW50aXRpZXNcbiAgICAgICAgICAgIHZhciBjb21iaW5lZEVudGl0aWVzID0gYXJncy5lbnRpdGllcy5tYXAoZnVuY3Rpb24gKG9FbnRpdHksIGlJbmRleCkge1xuICAgICAgICAgICAgICAgIGlmIChpc0NvbWJpbmVkSW5kZXhbaUluZGV4XSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgaSA9IGlJbmRleCArIDE7XG4gICAgICAgICAgICAgICAgb05ld0VudGl0eSA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9FbnRpdHkpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChpIDwgYXJncy5lbnRpdGllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9OZXh0ID0gYXJncy5lbnRpdGllc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9OZXh0LnR5cGUgPT09IG9FbnRpdHkudHlwZSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgKG9OZXh0LnN0YXJ0SW5kZXggPT09IChvTmV3RW50aXR5LmVuZEluZGV4ICsgMSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvTmV4dC5zdGFydEluZGV4ID09PSAob05ld0VudGl0eS5lbmRJbmRleCArIDIpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNwYWNlZCA9IG9OZXh0LnN0YXJ0SW5kZXggPT09IChvTmV3RW50aXR5LmVuZEluZGV4ICsgMik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0NvbWJpbmVkSW5kZXhbaV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgb05ld0VudGl0eS5lbnRpdHkgPSBvTmV3RW50aXR5LmVudGl0eSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKHNwYWNlZCA/ICcgJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb05leHQuZW50aXR5O1xuICAgICAgICAgICAgICAgICAgICAgICAgb05ld0VudGl0eS5lbmRJbmRleCA9IG9OZXh0LmVuZEluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgaSA9IGkgKyAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaSA9IGFyZ3MuZW50aXRpZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSAvLyB3aGlsZVxuICAgICAgICAgICAgICAgIHJldHVybiBvTmV3RW50aXR5O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNob3cgRW50aXR5XCIpO1xuICAgICAgICAgICAgY29tYmluZWRFbnRpdGllcyA9IGNvbWJpbmVkRW50aXRpZXMuZmlsdGVyKGZ1bmN0aW9uIChvRW50aXR5KSB7IHJldHVybiBvRW50aXR5ICE9PSB1bmRlZmluZWQ7IH0pO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3JhdzogJyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpLCB1bmRlZmluZWQsIDIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2NvbWJpbmVkOiAnICsgSlNPTi5zdHJpbmdpZnkoY29tYmluZWRFbnRpdGllcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgdmFyIHN5c3RlbUlkID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ1N5c3RlbUlkJyk7XG4gICAgICAgICAgICAgICAgICB2YXIgY2xpZW50ID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ2NsaWVudCcpO1xuICAgICAgICAgICAgICAgICAgdmFyIHN5c3RlbU9iamVjdElkID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ3N5c3RlbU9iamVjdElkJykgfHxcbiAgICAgICAgICAgICAgICAgICAgYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ1N5c3RlbU9iamVjdCcpIHx8XG4gICAgICAgICAgICAgICAgICAgIGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGNvbWJpbmVkRW50aXRpZXMsICdidWlsdGluLm51bWJlcicpO1xuICAgICAgICAgICAgICAgICAgdmFyIHN5c3RlbU9iamVjdENhdGVnb3J5ID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ1N5c3RlbU9iamVjdENhdGVnb3J5Jyk7XG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLnN5c3RlbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtSWQ6IHN5c3RlbUlkLFxuICAgICAgICAgICAgICAgICAgICBjbGllbnQ6IGNsaWVudFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgdmFyIHNTeXN0ZW1JZCA9IHN5c3RlbUlkICYmIHN5c3RlbUlkLmVudGl0eTtcbiAgICAgICAgICAgICAgICAgIHZhciBzQ2xpZW50ID0gY2xpZW50ICYmIGNsaWVudC5lbnRpdHk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3N5c3RlbU9iamVjdElkID0gc3lzdGVtT2JqZWN0SWQgJiYgc3lzdGVtT2JqZWN0SWQuZW50aXR5O1xuICAgICAgICAgICAgICAgICAgdmFyIHNTeXN0ZW1PYmplY3RDYXRlZ29yeSA9IHN5c3RlbU9iamVjdENhdGVnb3J5ICYmIHN5c3RlbU9iamVjdENhdGVnb3J5LmVudGl0eTtcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2hvdyBlbnRpdGllczogJyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdTaG93aW5nIGVudGl0eSAuLi4nKTtcbiAgICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhcInNob3cgZW50aXR5LCBTaG93IHNlc3Npb24gOiBcIiArIEpTT04uc3RyaW5naWZ5KHNlc3Npb24pKVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJTaG93IGVudGl0eSA6IFwiICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcykpXG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBkaWFsb2cubWF0Y2hlcygnd3JvbmcnLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmJlZ2luRGlhbG9nKCcvdXBkb3duJywgc2Vzc2lvbi51c2VyRGF0YS5jb3VudCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm07XG4gICAgICAgICAgICBzZXNzaW9uLnNlbmQoXCJiYWNrIGZyb20gd3JvbmcgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJlc3VsdHMpKTtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHNlc3Npb24uc2VuZCgnZW5kIG9mIHdyb25nJyk7XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBkaWFsb2cubWF0Y2hlcygnZXhpdCcsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdleGl0IDonKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdleGl0JyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpKTtcbiAgICAgICAgfVxuICAgIF0pO1xuICAgIC8vIEFkZCBpbnRlbnQgaGFuZGxlcnNcbiAgICBkaWFsb2cubWF0Y2hlcygndHJhaW4nLCBbXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndHJhaW4nKTtcbiAgICAgICAgICAgIC8vIFJlc29sdmUgYW5kIHN0b3JlIGFueSBlbnRpdGllcyBwYXNzZWQgZnJvbSBMVUlTLlxuICAgICAgICAgICAgdmFyIHRpdGxlID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ2J1aWx0aW4uYWxhcm0udGl0bGUnKTtcbiAgICAgICAgICAgIHZhciB0aW1lID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLnJlc29sdmVUaW1lKGFyZ3MuZW50aXRpZXMpO1xuICAgICAgICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtID0ge1xuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZSA/IHRpdGxlLmVudGl0eSA6IG51bGwsXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiB0aW1lID8gdGltZS5nZXRUaW1lKCkgOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gUHJvbXB0IGZvciB0aXRsZVxuICAgICAgICAgICAgaWYgKCFhbGFybS50aXRsZSkge1xuICAgICAgICAgICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdXaGF0IGZhY3Qgd291bGQgeW91IGxpa2UgdG8gdHJhaW4/Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm07XG4gICAgICAgICAgICBpZiAocmVzdWx0cy5yZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGFsYXJtLnRpdGxlID0gcmVzdWx0cy5yZXNwb25zZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFByb21wdCBmb3IgdGltZSAodGl0bGUgd2lsbCBiZSBibGFuayBpZiB0aGUgdXNlciBzYWlkIGNhbmNlbClcbiAgICAgICAgICAgIGlmIChhbGFybS50aXRsZSAmJiAhYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRpbWUoc2Vzc2lvbiwgJ1doYXQgdGltZSB3b3VsZCB5b3UgbGlrZSB0byBzZXQgdGhlIGFsYXJtIGZvcj8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLnJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIucmVzb2x2ZVRpbWUoW3Jlc3VsdHMucmVzcG9uc2VdKTtcbiAgICAgICAgICAgICAgICBhbGFybS50aW1lc3RhbXAgPSB0aW1lID8gdGltZS5nZXRUaW1lKCkgOiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU2V0IHRoZSBhbGFybSAoaWYgdGl0bGUgb3IgdGltZXN0YW1wIGlzIGJsYW5rIHRoZSB1c2VyIHNhaWQgY2FuY2VsKVxuICAgICAgICAgICAgaWYgKGFsYXJtLnRpdGxlICYmIGFsYXJtLnRpbWVzdGFtcCkge1xuICAgICAgICAgICAgICAgIC8vIFNhdmUgYWRkcmVzcyBvZiB3aG8gdG8gbm90aWZ5IGFuZCB3cml0ZSB0byBzY2hlZHVsZXIuXG4gICAgICAgICAgICAgICAgYWxhcm0uYWRkcmVzcyA9IHNlc3Npb24ubWVzc2FnZS5hZGRyZXNzO1xuICAgICAgICAgICAgICAgIGFsYXJtc1thbGFybS50aXRsZV0gPSBhbGFybTtcbiAgICAgICAgICAgICAgICAvLyBTZW5kIGNvbmZpcm1hdGlvbiB0byB1c2VyXG4gICAgICAgICAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShhbGFybS50aW1lc3RhbXApO1xuICAgICAgICAgICAgICAgIHZhciBpc0FNID0gZGF0ZS5nZXRIb3VycygpIDwgMTI7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdDcmVhdGluZyBhbGFybSBuYW1lZCBcIiVzXCIgZm9yICVkLyVkLyVkICVkOiUwMmQlcycsIGFsYXJtLnRpdGxlLCBkYXRlLmdldE1vbnRoKCkgKyAxLCBkYXRlLmdldERhdGUoKSwgZGF0ZS5nZXRGdWxsWWVhcigpLCBpc0FNID8gZGF0ZS5nZXRIb3VycygpIDogZGF0ZS5nZXRIb3VycygpIC0gMTIsIGRhdGUuZ2V0TWludXRlcygpLCBpc0FNID8gJ2FtJyA6ICdwbScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdPay4uLiBubyBwcm9ibGVtLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgXSk7XG4gICAgZGlhbG9nLm9uRGVmYXVsdChidWlsZGVyLkRpYWxvZ0FjdGlvbi5zZW5kKCdJXFwnbSBzb3JyeSBJIGRpZG5cXCd0IHVuZGVyc3RhbmQuIEkgY2FuIG9ubHkgc2hvdyBzdGFydCBhbmQgcmluZycpKTtcbiAgICAvLyBWZXJ5IHNpbXBsZSBhbGFybSBzY2hlZHVsZXJcbiAgICB2YXIgYWxhcm1zID0ge307XG4gICAgc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBhbGFybXMpIHtcbiAgICAgICAgICAgIHZhciBhbGFybSA9IGFsYXJtc1trZXldO1xuICAgICAgICAgICAgaWYgKG5vdyA+PSBhbGFybS50aW1lc3RhbXApIHtcbiAgICAgICAgICAgICAgICB2YXIgbXNnID0gbmV3IGJ1aWxkZXIuTWVzc2FnZSgpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRyZXNzKGFsYXJtLmFkZHJlc3MpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KCdIZXJlXFwncyB5b3VyIFxcJyVzXFwnIGFsYXJtLicsIGFsYXJtLnRpdGxlKTtcbiAgICAgICAgICAgICAgICBib3Quc2VuZChtc2cpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBhbGFybXNba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sIDE1MDAwKTtcbn1cbmlmIChtb2R1bGUpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAgICAgbWFrZUJvdDogbWFrZUJvdFxuICAgIH07XG59XG4iLCIvKipcbiAqIFRoZSBib3QgaW1wbGVtZW50YXRpb25cbiAqXG4gKiBJbnN0YW50aWF0ZSBhcHNzaW5nIGEgY29ubmVjdG9yIHZpYVxuICogbWFrZUJvdFxuICpcbiAqL1xuXG4vLyB2YXIgZXhlYyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5leGVjXG5cbi8vIHZhciByZXF1ZXN0MiA9IHJlcXVpcmUoJ3JlcXVlc3QtZGVmYXVsdHMnKVxuLy8gdmFyIHJlcXVlc3QgPSByZXF1ZXN0Mi5nbG9iYWxEZWZhdWx0cyh7XG4vLyAgJ3Byb3h5JzogJ2h0dHA6Ly9wcm94eTo4MDgwJyxcbi8vICAnaHR0cHMtcHJveHknOiAnaHR0cHM6Ly9wcm94eTo4MDgwJ1xuLy8gfSlcblxuaW1wb3J0ICogYXMgYnVpbGRlciBmcm9tICdib3RidWlsZGVyJztcbi8vdmFyIGJ1aWxkZXIgPSByZXF1aXJlKCdib3RidWlsZGVyJyk7XG5cbnZhciBkaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vbWF0Y2gvZGlzcGF0Y2hlci5qcycpLmRpc3BhdGNoZXI7XG5cblxuY2xhc3MgU2ltcGxlUmVjb2duaXplciBpbXBsZW1lbnRzIGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcblxuICB9XG5cbiAgcmVjb2duaXplKGNvbnRleHQ6IGJ1aWxkZXIuSVJlY29nbml6ZUNvbnRleHQsIGNhbGxiYWNrOiAoZXJyOiBFcnJvciwgcmVzdWx0OiBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdmFyIHUgPSB7fSBhcyBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0O1xuXG4gICAgY29uc29sZS5sb2coXCJyZWNvZ25pemluZyBcIiArIGNvbnRleHQubWVzc2FnZS50ZXh0KTtcbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInN0YXJ0XCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJTaG93RW50aXR5XCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwic3RhcnQgXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInRyYWluXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJ0cmFpblwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInRyYWluIFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwibGVhcm5cIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcImxlYXJuXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEudHlwZSA9IFwidHJhaW5GYWN0XCI7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImhlbHBcIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcImhlbHBcIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImV4aXRcIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcImV4aXRcIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcIndyb25nXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJ3cm9uZ1wiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ3JlY29nbml6aW5nIG5vdGhpbmcnKTtcbiAgICAgIHUuaW50ZW50ID0gXCJOb25lXCI7XG4gICAgICB1LnNjb3JlID0gMC4xO1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4xO1xuICAgICAgdS5lbnRpdGllcyA9IFtdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgfVxufVxuXG5cbmNsYXNzIFNpbXBsZVVwRG93blJlY29nbml6ZXIgaW1wbGVtZW50cyBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG5cbiAgfVxuXG4gIHJlY29nbml6ZShjb250ZXh0OiBidWlsZGVyLklSZWNvZ25pemVDb250ZXh0LCBjYWxsYmFjazogKGVycjogRXJyb3IsIHJlc3VsdDogYnVpbGRlci5JSW50ZW50UmVjb2duaXplclJlc3VsdCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHZhciB1ID0ge30gYXMgYnVpbGRlci5JSW50ZW50UmVjb2duaXplclJlc3VsdDtcblxuICAgIGNvbnNvbGUubG9nKFwicmVjb2duaXppbmcgXCIgKyBjb250ZXh0Lm1lc3NhZ2UudGV4dCk7XG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJkb3duXCIpID49IDApIHtcbiAgICAgIHUuaW50ZW50ID0gXCJkb3duXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwic3RhcnQgXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwidXBcIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcInVwXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwidXBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygncmVjb2duaXppbmcgbm90aGluZycpO1xuICAgICAgdS5pbnRlbnQgPSBcIk5vbmVcIjtcbiAgICAgIHUuc2NvcmUgPSAwLjE7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjE7XG4gICAgICB1LmVudGl0aWVzID0gW107XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICB9XG59XG5cbmNvbnN0IEFueU9iamVjdCA9IE9iamVjdCBhcyBhbnk7XG4vLyBnbG9iYWxUdW5uZWwuaW5pdGlhbGl6ZSh7XG4vLyAgaG9zdDogJ3Byb3h5LmV4eHhhbXBsZS5jb20nLFxuLy8gIHBvcnQ6IDgwODBcbi8vIH0pXG5cbi8vIENyZWF0ZSBib3QgYW5kIGJpbmQgdG8gY29uc29sZVxuLy8gdmFyIGNvbm5lY3RvciA9IG5ldyBodG1sY29ubmVjdG9yLkhUTUxDb25uZWN0b3IoKVxuXG4vLyBjb25uZWN0b3Iuc2V0QW5zd2VySG9vayhmdW5jdGlvbiAoc0Fuc3dlcikge1xuLy8gIGNvbnNvbGUubG9nKCdHb3QgYW5zd2VyIDogJyArIHNBbnN3ZXIgKyAnXFxuJylcbi8vIH0pXG5cbnZhciBib3Q7XG4vLyBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbi8vICAgY29ubmVjdG9yLnByb2Nlc3NNZXNzYWdlKCdzdGFydCB1bml0IHRlc3QgQUJDICcpXG4vLyB9LCA1MDAwKVxuXG4vKipcbiAqIENvbnN0cnVjdCBhIGJvdFxuICogQHBhcmFtIGNvbm5lY3RvciB7Q29ubmVjdG9yfSB0aGUgY29ubmVjdG9yIHRvIHVzZVxuICogSFRNTENvbm5lY3RvclxuICogb3IgY29ubmVjdG9yID0gbmV3IGJ1aWxkZXIuQ29uc29sZUNvbm5lY3RvcigpLmxpc3RlbigpXG4gKi9cbmZ1bmN0aW9uIG1ha2VCb3QoY29ubmVjdG9yKSB7XG4gIGJvdCA9IG5ldyBidWlsZGVyLlVuaXZlcnNhbEJvdChjb25uZWN0b3IpO1xuXG4gIC8vIENyZWF0ZSBMVUlTIHJlY29nbml6ZXIgdGhhdCBwb2ludHMgYXQgb3VyIG1vZGVsIGFuZCBhZGQgaXQgYXMgdGhlIHJvb3QgJy8nIGRpYWxvZyBmb3Igb3VyIENvcnRhbmEgQm90LlxuICAvLyB2YXIgbW9kZWwgPSBzZW5zaXRpdmUubW9kZWx1cmw7XG4gIC8vIHZhciBtb2RlbCA9ICdodHRwczovL2FwaS5wcm9qZWN0b3hmb3JkLmFpL2x1aXMvdjIuMC9hcHBzL2M0MTNiMmVmLTM4MmMtNDViZC04ZmYwLWY3NmQ2MGUyYTgyMT9zdWJzY3JpcHRpb24ta2V5PWMyMTM5OGI1OTgwYTRjZTA5ZjQ3NGJiZmVlOTNiODkyJnE9J1xuICB2YXIgcmVjb2duaXplciA9IG5ldyBTaW1wbGVSZWNvZ25pemVyKCk7IC8vIGJ1aWxkZXIuTHVpc1JlY29nbml6ZXIobW9kZWwpO1xuXG4gIHZhciBkaWFsb2cgPSBuZXcgYnVpbGRlci5JbnRlbnREaWFsb2coeyByZWNvZ25pemVyczogW3JlY29nbml6ZXJdIH0pO1xuICAvLyBkaWFsb2cub25CZWdpbihmdW5jdGlvbihzZXNzaW9uLGFyZ3MpIHtcbiAgLy8gY29uc29sZS5sb2coXCJiZWdpbm5pbmcgLi4uXCIpXG4gIC8vIHNlc3Npb24uZGlhbG9nRGF0YS5yZXRyeVByb21wdCA9IGFyZ3MgJiYgYXJncy5yZXRyeVByb21wdCB8fCBcIkkgYW0gc29ycnlcIlxuICAvLyBzZXNzaW9uLnNlbmQoXCJXaGF0IGRvIHlvdSB3YW50P1wiKVxuICAvL1xuICAvLyB9KVxuXG4gIHZhciBkaWFsb2dVcERvd24gPSBuZXcgYnVpbGRlci5JbnRlbnREaWFsb2coeyByZWNvZ25pemVyczogWyBuZXcgU2ltcGxlVXBEb3duUmVjb2duaXplcigpXSB9KTtcblxuXG4gIGJvdC5kaWFsb2coJy91cGRvd24nLCBkaWFsb2dVcERvd24pO1xuICBkaWFsb2dVcERvd24ub25CZWdpbihmdW5jdGlvbihzZXNzaW9uKSB7XG4gICAgc2Vzc2lvbi5zZW5kKFwiSGkgdGhlcmUsIHVwZG93biBpcyB3YWl0aW5nIGZvciB5b3VcIik7XG4gIH0pXG5cbiAgZGlhbG9nVXBEb3duLm1hdGNoZXMoJ2ludGVudC51cCcsIFtcbiAgICBmdW5jdGlvbihzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICd5b3Ugd2FudCB0byBnbyB1cCcpO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSByZXN1bHRzLnJlcG9uc2U7XG4gICAgICBuZXh0KCk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgc2Vzc2lvbi5lbmREaWFsb2dXaXRoUmVzdWx0KHsgcmVzcG9uc2UgOiBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjIH0pO1xuICAgIH1cbiAgXVxuICApO1xuXG4gIGRpYWxvZ1VwRG93bi5tYXRjaGVzKCdpbnRlbnQuZG93bicsIFtcbiAgICBmdW5jdGlvbihzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICd5b3Ugd2FudCB0byBnbyBkb3duIScpO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSAtMTsgLy8gcmVzdWx0cy5yZXBvbnNlO1xuICAgICAgbmV4dCgpO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgIHNlc3Npb24uZW5kRGlhbG9nV2l0aFJlc3VsdCh7XG4gICAgICAgcmVzcG9uc2UgOiB7IHJlcyA6IFwiZG93blwiICwgdSA6IHNlc3Npb24uZGlhbG9nRGF0YS5hYmN9IH0pO1xuICAgIH1cbiAgXVxuICApO1xuXG4gIGJvdC5kaWFsb2coJy90cmFpbicsIFtcbiAgICBmdW5jdGlvbihzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICBzZXNzaW9uLmRpYWxnb0RhdGEuYWJjID0gYXJncyB8fCB7fTtcbiAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdEbyB5b3Ugd2FudCB0byB0cmFpbiBtZScpO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSByZXN1bHRzLnJlcG9uc2U7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgc2Vzc2lvbi5lbmREaWFsb2dXaXRoUmVzdWx0KHsgcmVzcG9uc2UgOiBzZXNzaW9uLkRpYWxvZ0RhdGEuYWJjIH0pO1xuICAgIH1cbiAgXSk7XG5cblxuICBib3QuZGlhbG9nKCcvJywgZGlhbG9nKTtcblxuICBkaWFsb2cubWF0Y2hlcygnU2hvd0VudGl0eScsIFtcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgdmFyIGlzQ29tYmluZWRJbmRleCA9IHt9O1xuICAgICAgdmFyIG9OZXdFbnRpdHk7XG4gICAgICAvLyBmdXNlIGVudGl0aWVzXG4gICAgICB2YXIgY29tYmluZWRFbnRpdGllcyA9IGFyZ3MuZW50aXRpZXMubWFwKGZ1bmN0aW9uIChvRW50aXR5LCBpSW5kZXgpIHtcbiAgICAgICAgaWYgKGlzQ29tYmluZWRJbmRleFtpSW5kZXhdKSB7XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaSA9IGlJbmRleCArIDE7XG4gICAgICAgIG9OZXdFbnRpdHkgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvRW50aXR5KTtcblxuICAgICAgICB3aGlsZSAoaSA8IGFyZ3MuZW50aXRpZXMubGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIG9OZXh0ID0gYXJncy5lbnRpdGllc1tpXTtcbiAgICAgICAgICBpZiAob05leHQudHlwZSA9PT0gb0VudGl0eS50eXBlICYmXG4gICAgICAgICAgICAob05leHQuc3RhcnRJbmRleCA9PT0gKG9OZXdFbnRpdHkuZW5kSW5kZXggKyAxKSB8fFxuICAgICAgICAgICAgICBvTmV4dC5zdGFydEluZGV4ID09PSAob05ld0VudGl0eS5lbmRJbmRleCArIDIpXG4gICAgICAgICAgICApKSB7XG4gICAgICAgICAgICB2YXIgc3BhY2VkID0gb05leHQuc3RhcnRJbmRleCA9PT0gKG9OZXdFbnRpdHkuZW5kSW5kZXggKyAyKTtcbiAgICAgICAgICAgIGlzQ29tYmluZWRJbmRleFtpXSA9IHRydWU7XG4gICAgICAgICAgICBvTmV3RW50aXR5LmVudGl0eSA9IG9OZXdFbnRpdHkuZW50aXR5ICtcbiAgICAgICAgICAgICAgKHNwYWNlZCA/ICcgJyA6ICcnKSArXG4gICAgICAgICAgICAgIG9OZXh0LmVudGl0eTtcbiAgICAgICAgICAgIG9OZXdFbnRpdHkuZW5kSW5kZXggPSBvTmV4dC5lbmRJbmRleDtcbiAgICAgICAgICAgIGkgPSBpICsgMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaSA9IGFyZ3MuZW50aXRpZXMubGVuZ3RoO1xuICAgICAgICAgIH1cbiAgICAgICAgfSAvLyB3aGlsZVxuICAgICAgICByZXR1cm4gb05ld0VudGl0eTtcbiAgICAgIH0pO1xuICAgICAgY29uc29sZS5sb2coXCJTaG93IEVudGl0eVwiKTtcbiAgICAgIGNvbWJpbmVkRW50aXRpZXMgPSBjb21iaW5lZEVudGl0aWVzLmZpbHRlcihmdW5jdGlvbiAob0VudGl0eSkgeyByZXR1cm4gb0VudGl0eSAhPT0gdW5kZWZpbmVkOyB9KTtcbiAgICAgIGNvbnNvbGUubG9nKCdyYXc6ICcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzKSwgdW5kZWZpbmVkLCAyKTtcbiAgICAgIGNvbnNvbGUubG9nKCdjb21iaW5lZDogJyArIEpTT04uc3RyaW5naWZ5KGNvbWJpbmVkRW50aXRpZXMsIHVuZGVmaW5lZCwgMikpO1xuLypcbiAgICAgIHZhciBzeXN0ZW1JZCA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGNvbWJpbmVkRW50aXRpZXMsICdTeXN0ZW1JZCcpO1xuICAgICAgdmFyIGNsaWVudCA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdjbGllbnQnKTtcbiAgICAgIHZhciBzeXN0ZW1PYmplY3RJZCA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGNvbWJpbmVkRW50aXRpZXMsICdzeXN0ZW1PYmplY3RJZCcpIHx8XG4gICAgICAgIGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGNvbWJpbmVkRW50aXRpZXMsICdTeXN0ZW1PYmplY3QnKSB8fFxuICAgICAgICBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnYnVpbHRpbi5udW1iZXInKTtcbiAgICAgIHZhciBzeXN0ZW1PYmplY3RDYXRlZ29yeSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdTeXN0ZW1PYmplY3RDYXRlZ29yeScpO1xuXG4gICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuc3lzdGVtID0ge1xuICAgICAgICBzeXN0ZW1JZDogc3lzdGVtSWQsXG4gICAgICAgIGNsaWVudDogY2xpZW50XG4gICAgICB9O1xuKi9cbi8qXG4gICAgICB2YXIgc1N5c3RlbUlkID0gc3lzdGVtSWQgJiYgc3lzdGVtSWQuZW50aXR5O1xuICAgICAgdmFyIHNDbGllbnQgPSBjbGllbnQgJiYgY2xpZW50LmVudGl0eTtcbiAgICAgIHZhciBzc3lzdGVtT2JqZWN0SWQgPSBzeXN0ZW1PYmplY3RJZCAmJiBzeXN0ZW1PYmplY3RJZC5lbnRpdHk7XG4gICAgICB2YXIgc1N5c3RlbU9iamVjdENhdGVnb3J5ID0gc3lzdGVtT2JqZWN0Q2F0ZWdvcnkgJiYgc3lzdGVtT2JqZWN0Q2F0ZWdvcnkuZW50aXR5O1xuKi9cbiAgICAgIGNvbnNvbGUubG9nKCdTaG93IGVudGl0aWVzOiAnICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcywgdW5kZWZpbmVkLCAyKSk7XG5cbiAgICAgIHNlc3Npb24uc2VuZCgnU2hvd2luZyBlbnRpdHkgLi4uJyk7XG4gICAgICAvLyAgY29uc29sZS5sb2coXCJzaG93IGVudGl0eSwgU2hvdyBzZXNzaW9uIDogXCIgKyBKU09OLnN0cmluZ2lmeShzZXNzaW9uKSlcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwiU2hvdyBlbnRpdHkgOiBcIiArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpKVxuICAgIH1cbiAgXSk7XG5cbiAgZGlhbG9nLm1hdGNoZXMoJ3dyb25nJywgIFtcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICBzZXNzaW9uLmJlZ2luRGlhbG9nKCcvdXBkb3duJywgc2Vzc2lvbi51c2VyRGF0YS5jb3VudCApO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICAgIHNlc3Npb24uc2VuZChcImJhY2sgZnJvbSB3cm9uZyA6IFwiICsgSlNPTi5zdHJpbmdpZnkocmVzdWx0cykpO1xuICAgICAgbmV4dCgpO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKCdlbmQgb2Ygd3JvbmcnKTtcbiAgICB9XG4gIF0pO1xuXG4gIGRpYWxvZy5tYXRjaGVzKCdleGl0JywgW1xuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICBjb25zb2xlLmxvZygnZXhpdCA6Jyk7XG4gICAgICBjb25zb2xlLmxvZygnZXhpdCcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzKSk7XG4gICAgfVxuICBdKTtcblxuICAvLyBBZGQgaW50ZW50IGhhbmRsZXJzXG4gIGRpYWxvZy5tYXRjaGVzKCd0cmFpbicsIFtcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgY29uc29sZS5sb2coJ3RyYWluJyk7XG4gICAgICAvLyBSZXNvbHZlIGFuZCBzdG9yZSBhbnkgZW50aXRpZXMgcGFzc2VkIGZyb20gTFVJUy5cbiAgICAgIHZhciB0aXRsZSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGFyZ3MuZW50aXRpZXMsICdidWlsdGluLmFsYXJtLnRpdGxlJyk7XG4gICAgICB2YXIgdGltZSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5yZXNvbHZlVGltZShhcmdzLmVudGl0aWVzKTtcbiAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybSA9IHtcbiAgICAgICAgdGl0bGU6IHRpdGxlID8gdGl0bGUuZW50aXR5IDogbnVsbCxcbiAgICAgICAgdGltZXN0YW1wOiB0aW1lID8gdGltZS5nZXRUaW1lKCkgOiBudWxsXG4gICAgICB9O1xuICAgICAgLy8gUHJvbXB0IGZvciB0aXRsZVxuICAgICAgaWYgKCFhbGFybS50aXRsZSkge1xuICAgICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCAnV2hhdCBmYWN0IHdvdWxkIHlvdSBsaWtlIHRvIHRyYWluPycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICAgIGlmIChyZXN1bHRzLnJlc3BvbnNlKSB7XG4gICAgICAgIGFsYXJtLnRpdGxlID0gcmVzdWx0cy5yZXNwb25zZTtcbiAgICAgIH1cblxuICAgICAgLy8gUHJvbXB0IGZvciB0aW1lICh0aXRsZSB3aWxsIGJlIGJsYW5rIGlmIHRoZSB1c2VyIHNhaWQgY2FuY2VsKVxuICAgICAgaWYgKGFsYXJtLnRpdGxlICYmICFhbGFybS50aW1lc3RhbXApIHtcbiAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRpbWUoc2Vzc2lvbiwgJ1doYXQgdGltZSB3b3VsZCB5b3UgbGlrZSB0byBzZXQgdGhlIGFsYXJtIGZvcj8nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm07XG4gICAgICBpZiAocmVzdWx0cy5yZXNwb25zZSkge1xuICAgICAgICB2YXIgdGltZSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5yZXNvbHZlVGltZShbcmVzdWx0cy5yZXNwb25zZV0pO1xuICAgICAgICBhbGFybS50aW1lc3RhbXAgPSB0aW1lID8gdGltZS5nZXRUaW1lKCkgOiBudWxsO1xuICAgICAgfVxuICAgICAgLy8gU2V0IHRoZSBhbGFybSAoaWYgdGl0bGUgb3IgdGltZXN0YW1wIGlzIGJsYW5rIHRoZSB1c2VyIHNhaWQgY2FuY2VsKVxuICAgICAgaWYgKGFsYXJtLnRpdGxlICYmIGFsYXJtLnRpbWVzdGFtcCkge1xuICAgICAgICAvLyBTYXZlIGFkZHJlc3Mgb2Ygd2hvIHRvIG5vdGlmeSBhbmQgd3JpdGUgdG8gc2NoZWR1bGVyLlxuICAgICAgICBhbGFybS5hZGRyZXNzID0gc2Vzc2lvbi5tZXNzYWdlLmFkZHJlc3M7XG4gICAgICAgIGFsYXJtc1thbGFybS50aXRsZV0gPSBhbGFybTtcblxuICAgICAgICAvLyBTZW5kIGNvbmZpcm1hdGlvbiB0byB1c2VyXG4gICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoYWxhcm0udGltZXN0YW1wKTtcbiAgICAgICAgdmFyIGlzQU0gPSBkYXRlLmdldEhvdXJzKCkgPCAxMjtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKCdDcmVhdGluZyBhbGFybSBuYW1lZCBcIiVzXCIgZm9yICVkLyVkLyVkICVkOiUwMmQlcycsXG4gICAgICAgICAgYWxhcm0udGl0bGUsXG4gICAgICAgICAgZGF0ZS5nZXRNb250aCgpICsgMSwgZGF0ZS5nZXREYXRlKCksIGRhdGUuZ2V0RnVsbFllYXIoKSxcbiAgICAgICAgICBpc0FNID8gZGF0ZS5nZXRIb3VycygpIDogZGF0ZS5nZXRIb3VycygpIC0gMTIsIGRhdGUuZ2V0TWludXRlcygpLCBpc0FNID8gJ2FtJyA6ICdwbScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2Vzc2lvbi5zZW5kKCdPay4uLiBubyBwcm9ibGVtLicpO1xuICAgICAgfVxuICAgIH1cbiAgXSk7XG5cbiAgZGlhbG9nLm9uRGVmYXVsdChidWlsZGVyLkRpYWxvZ0FjdGlvbi5zZW5kKCdJXFwnbSBzb3JyeSBJIGRpZG5cXCd0IHVuZGVyc3RhbmQuIEkgY2FuIG9ubHkgc2hvdyBzdGFydCBhbmQgcmluZycpKTtcblxuICAvLyBWZXJ5IHNpbXBsZSBhbGFybSBzY2hlZHVsZXJcbiAgdmFyIGFsYXJtcyA9IHt9O1xuICBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIGZvciAodmFyIGtleSBpbiBhbGFybXMpIHtcbiAgICAgIHZhciBhbGFybSA9IGFsYXJtc1trZXldO1xuICAgICAgaWYgKG5vdyA+PSBhbGFybS50aW1lc3RhbXApIHtcbiAgICAgICAgdmFyIG1zZyA9IG5ldyBidWlsZGVyLk1lc3NhZ2UoKVxuICAgICAgICAgIC5hZGRyZXNzKGFsYXJtLmFkZHJlc3MpXG4gICAgICAgICAgLnRleHQoJ0hlcmVcXCdzIHlvdXIgXFwnJXNcXCcgYWxhcm0uJywgYWxhcm0udGl0bGUpO1xuICAgICAgICBib3Quc2VuZChtc2cpO1xuICAgICAgICBkZWxldGUgYWxhcm1zW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9LCAxNTAwMCk7XG59XG5cbmlmIChtb2R1bGUpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbWFrZUJvdDogbWFrZUJvdFxuICB9O1xufVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
