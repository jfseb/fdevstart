"use strict";
/**
 * The bot implementation
 *
 * Instantiate apssing a connector via
 * makeBot
 *
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
    function SimpleRecognizer() {
        _classCallCheck(this, SimpleRecognizer);
    }

    _createClass(SimpleRecognizer, [{
        key: "recognize",
        value: function recognize(context, callback) {
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
        }
    }]);

    return SimpleRecognizer;
}();

var SimpleUpDownRecognizer = function () {
    function SimpleUpDownRecognizer() {
        _classCallCheck(this, SimpleUpDownRecognizer);
    }

    _createClass(SimpleUpDownRecognizer, [{
        key: "recognize",
        value: function recognize(context, callback) {
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
        }
    }]);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJvdC9kdW1iZGlhbG9nLmpzIiwiLi4vc3JjL2JvdC9kdW1iZGlhbG9nLnRzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiYnVpbGRlciIsInJlcXVpcmUiLCJkaXNwYXRjaGVyIiwiU2ltcGxlUmVjb2duaXplciIsImNvbnRleHQiLCJjYWxsYmFjayIsInUiLCJjb25zb2xlIiwibG9nIiwibWVzc2FnZSIsInRleHQiLCJpbmRleE9mIiwiaW50ZW50Iiwic2NvcmUiLCJlMSIsInN0YXJ0SW5kZXgiLCJsZW5ndGgiLCJlbmRJbmRleCIsImVudGl0aWVzIiwidW5kZWZpbmVkIiwidHlwZSIsIlNpbXBsZVVwRG93blJlY29nbml6ZXIiLCJBbnlPYmplY3QiLCJib3QiLCJtYWtlQm90IiwiY29ubmVjdG9yIiwiVW5pdmVyc2FsQm90IiwicmVjb2duaXplciIsImRpYWxvZyIsIkludGVudERpYWxvZyIsInJlY29nbml6ZXJzIiwiZGlhbG9nVXBEb3duIiwib25CZWdpbiIsInNlc3Npb24iLCJzZW5kIiwibWF0Y2hlcyIsImFyZ3MiLCJuZXh0IiwiZGlhbG9nRGF0YSIsImFiYyIsIlByb21wdHMiLCJyZXN1bHRzIiwicmVwb25zZSIsImVuZERpYWxvZ1dpdGhSZXN1bHQiLCJyZXNwb25zZSIsInJlcyIsImRpYWxnb0RhdGEiLCJEaWFsb2dEYXRhIiwiaXNDb21iaW5lZEluZGV4Iiwib05ld0VudGl0eSIsImNvbWJpbmVkRW50aXRpZXMiLCJtYXAiLCJvRW50aXR5IiwiaUluZGV4IiwiaSIsImFzc2lnbiIsIm9OZXh0Iiwic3BhY2VkIiwiZW50aXR5IiwiZmlsdGVyIiwiSlNPTiIsInN0cmluZ2lmeSIsImJlZ2luRGlhbG9nIiwidXNlckRhdGEiLCJjb3VudCIsImFsYXJtIiwidGl0bGUiLCJFbnRpdHlSZWNvZ25pemVyIiwiZmluZEVudGl0eSIsInRpbWUiLCJyZXNvbHZlVGltZSIsInRpbWVzdGFtcCIsImdldFRpbWUiLCJhZGRyZXNzIiwiYWxhcm1zIiwiZGF0ZSIsIkRhdGUiLCJpc0FNIiwiZ2V0SG91cnMiLCJnZXRNb250aCIsImdldERhdGUiLCJnZXRGdWxsWWVhciIsImdldE1pbnV0ZXMiLCJvbkRlZmF1bHQiLCJEaWFsb2dBY3Rpb24iLCJzZXRJbnRlcnZhbCIsIm5vdyIsImtleSIsIm1zZyIsIk1lc3NhZ2UiLCJtb2R1bGUiXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7Ozs7Ozs7Ozs7OztBRFFBQSxPQUFPQyxjQUFQLENBQXNCQyxPQUF0QixFQUErQixZQUEvQixFQUE2QyxFQUFFQyxPQUFPLElBQVQsRUFBN0M7QUNBQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQSxJQUFBQyxVQUFBQyxRQUFBLFlBQUEsQ0FBQTtBQUNBO0FBRUEsSUFBSUMsYUFBYUQsUUFBUSx3QkFBUixFQUFrQ0MsVUFBbkQ7O0lBR0FDLGdCO0FBQ0UsZ0NBQUE7QUFBQTtBQUVDOzs7O2tDQUVTQyxPLEVBQW9DQyxRLEVBQXVFO0FBQ25ILGdCQUFJQyxJQUFJLEVBQVI7QUFFQUMsb0JBQVFDLEdBQVIsQ0FBWSxpQkFBaUJKLFFBQVFLLE9BQVIsQ0FBZ0JDLElBQTdDO0FBQ0EsZ0JBQUlOLFFBQVFLLE9BQVIsQ0FBZ0JDLElBQWhCLENBQXFCQyxPQUFyQixDQUE2QixPQUE3QixLQUF5QyxDQUE3QyxFQUFnRDtBQUM5Q0wsa0JBQUVNLE1BQUYsR0FBVyxZQUFYO0FBQ0FOLGtCQUFFTyxLQUFGLEdBQVUsR0FBVjtBQUNBLG9CQUFJQyxLQUFLLEVBQVQ7QUFDQUEsbUJBQUdDLFVBQUgsR0FBZ0IsU0FBU0MsTUFBekI7QUFDQUYsbUJBQUdHLFFBQUgsR0FBY2IsUUFBUUssT0FBUixDQUFnQkMsSUFBaEIsQ0FBcUJNLE1BQW5DO0FBQ0FGLG1CQUFHRCxLQUFILEdBQVcsR0FBWDtBQUNBUCxrQkFBRVksUUFBRixHQUFhLENBQUNKLEVBQUQsQ0FBYjtBQUNBVCx5QkFBU2MsU0FBVCxFQUFvQmIsQ0FBcEI7QUFDQTtBQUNEO0FBRUQs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QWEsbUJBQWI7QUFDRDtBQUNGLEtBcERxQixDQUF4QjtBQXVEQU4sV0FBT3VELFNBQVAsQ0FBaUJuRixRQUFRb0YsWUFBUixDQUFxQmxELElBQXJCLENBQTBCLGlFQUExQixDQUFqQjtBQUVBO0FBQ0EsUUFBSXdDLFNBQVMsRUFBYjtBQUNBVyxnQkFBWSxZQUFBO0FBQ1YsWUFBSUMsTUFBTSxJQUFJVixJQUFKLEdBQVdKLE9BQVgsRUFBVjtBQUNBLGFBQUssSUFBSWUsR0FBVCxJQUFnQmIsTUFBaEIsRUFBd0I7QUFDdEIsZ0JBQUlULFFBQVFTLE9BQU9hLEdBQVAsQ0FBWjtBQUNBLGdCQUFJRCxPQUFPckIsTUFBTU0sU0FBakIsRUFBNEI7QUFDMUIsb0JBQUlpQixNQUFNLElBQUl4RixRQUFReUYsT0FBWixHQUNQaEIsT0FETyxDQUNDUixNQUFNUSxPQURQLEVBRVAvRCxJQUZPLENBRUYsNEJBRkUsRUFFNEJ1RCxNQUFNQyxLQUZsQyxDQUFWO0FBR0EzQyxvQkFBSVcsSUFBSixDQUFTc0QsR0FBVDtBQUNBLHVCQUFPZCxPQUFPYSxHQUFQLENBQVA7QUFDRDtBQUNGO0FBQ0YsS0FaRCxFQVlHLEtBWkg7QUFhRDtBQUVELElBQUlHLE1BQUosRUFBWTtBQUNWQSxXQUFPNUYsT0FBUCxHQUFpQjtBQUNmMEIsaUJBQVNBO0FBRE0sS0FBakI7QUFHRCIsImZpbGUiOiJib3QvZHVtYmRpYWxvZy5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiBUaGUgYm90IGltcGxlbWVudGF0aW9uXG4gKlxuICogSW5zdGFudGlhdGUgYXBzc2luZyBhIGNvbm5lY3RvciB2aWFcbiAqIG1ha2VCb3RcbiAqXG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbi8vIHZhciBleGVjID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNcbi8vIHZhciByZXF1ZXN0MiA9IHJlcXVpcmUoJ3JlcXVlc3QtZGVmYXVsdHMnKVxuLy8gdmFyIHJlcXVlc3QgPSByZXF1ZXN0Mi5nbG9iYWxEZWZhdWx0cyh7XG4vLyAgJ3Byb3h5JzogJ2h0dHA6Ly9wcm94eTo4MDgwJyxcbi8vICAnaHR0cHMtcHJveHknOiAnaHR0cHM6Ly9wcm94eTo4MDgwJ1xuLy8gfSlcbmNvbnN0IGJ1aWxkZXIgPSByZXF1aXJlKFwiYm90YnVpbGRlclwiKTtcbi8vdmFyIGJ1aWxkZXIgPSByZXF1aXJlKCdib3RidWlsZGVyJyk7XG52YXIgZGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL21hdGNoL2Rpc3BhdGNoZXIuanMnKS5kaXNwYXRjaGVyO1xuY2xhc3MgU2ltcGxlUmVjb2duaXplciB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgfVxuICAgIHJlY29nbml6ZShjb250ZXh0LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgdSA9IHt9O1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlY29nbml6aW5nIFwiICsgY29udGV4dC5tZXNzYWdlLnRleHQpO1xuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInN0YXJ0XCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJTaG93RW50aXR5XCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJzdGFydCBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwidHJhaW5cIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcInRyYWluXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwibGVhcm5cIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcImxlYXJuXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS50eXBlID0gXCJ0cmFpbkZhY3RcIjtcbiAgICAgICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInRyYWluIFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJoZWxwXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJoZWxwXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJ0cmFpbiBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiZXhpdFwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwiZXhpdFwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwid3JvbmdcIikgPj0gMCkge1xuICAgICAgICAgICAgdS5pbnRlbnQgPSBcIndyb25nXCI7XG4gICAgICAgICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgICAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICAgICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJ3JlY29nbml6aW5nIG5vdGhpbmcnKTtcbiAgICAgICAgdS5pbnRlbnQgPSBcIk5vbmVcIjtcbiAgICAgICAgdS5zY29yZSA9IDAuMTtcbiAgICAgICAgdmFyIGUxID0ge307XG4gICAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgZTEuc2NvcmUgPSAwLjE7XG4gICAgICAgIHUuZW50aXRpZXMgPSBbXTtcbiAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICB9XG59XG5jbGFzcyBTaW1wbGVVcERvd25SZWNvZ25pemVyIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICB9XG4gICAgcmVjb2duaXplKGNvbnRleHQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciB1ID0ge307XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVjb2duaXppbmcgXCIgKyBjb250ZXh0Lm1lc3NhZ2UudGV4dCk7XG4gICAgICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiZG93blwiKSA+PSAwKSB7XG4gICAgICAgICAgICB1LmludGVudCA9IFwiZG93blwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwic3RhcnQgXCIubGVuZ3RoO1xuICAgICAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgICAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcInVwXCIpID49IDApIHtcbiAgICAgICAgICAgIHUuaW50ZW50ID0gXCJ1cFwiO1xuICAgICAgICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICAgICAgZTEuc3RhcnRJbmRleCA9IFwidXBcIi5sZW5ndGg7XG4gICAgICAgICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdyZWNvZ25pemluZyBub3RoaW5nJyk7XG4gICAgICAgIHUuaW50ZW50ID0gXCJOb25lXCI7XG4gICAgICAgIHUuc2NvcmUgPSAwLjE7XG4gICAgICAgIHZhciBlMSA9IHt9O1xuICAgICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICAgIGUxLnNjb3JlID0gMC4xO1xuICAgICAgICB1LmVudGl0aWVzID0gW107XG4gICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgfVxufVxuY29uc3QgQW55T2JqZWN0ID0gT2JqZWN0O1xuLy8gZ2xvYmFsVHVubmVsLmluaXRpYWxpemUoe1xuLy8gIGhvc3Q6ICdwcm94eS5leHh4YW1wbGUuY29tJyxcbi8vICBwb3J0OiA4MDgwXG4vLyB9KVxuLy8gQ3JlYXRlIGJvdCBhbmQgYmluZCB0byBjb25zb2xlXG4vLyB2YXIgY29ubmVjdG9yID0gbmV3IGh0bWxjb25uZWN0b3IuSFRNTENvbm5lY3RvcigpXG4vLyBjb25uZWN0b3Iuc2V0QW5zd2VySG9vayhmdW5jdGlvbiAoc0Fuc3dlcikge1xuLy8gIGNvbnNvbGUubG9nKCdHb3QgYW5zd2VyIDogJyArIHNBbnN3ZXIgKyAnXFxuJylcbi8vIH0pXG52YXIgYm90O1xuLy8gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4vLyAgIGNvbm5lY3Rvci5wcm9jZXNzTWVzc2FnZSgnc3RhcnQgdW5pdCB0ZXN0IEFCQyAnKVxuLy8gfSwgNTAwMClcbi8qKlxuICogQ29uc3RydWN0IGEgYm90XG4gKiBAcGFyYW0gY29ubmVjdG9yIHtDb25uZWN0b3J9IHRoZSBjb25uZWN0b3IgdG8gdXNlXG4gKiBIVE1MQ29ubmVjdG9yXG4gKiBvciBjb25uZWN0b3IgPSBuZXcgYnVpbGRlci5Db25zb2xlQ29ubmVjdG9yKCkubGlzdGVuKClcbiAqL1xuZnVuY3Rpb24gbWFrZUJvdChjb25uZWN0b3IpIHtcbiAgICBib3QgPSBuZXcgYnVpbGRlci5Vbml2ZXJzYWxCb3QoY29ubmVjdG9yKTtcbiAgICAvLyBDcmVhdGUgTFVJUyByZWNvZ25pemVyIHRoYXQgcG9pbnRzIGF0IG91ciBtb2RlbCBhbmQgYWRkIGl0IGFzIHRoZSByb290ICcvJyBkaWFsb2cgZm9yIG91ciBDb3J0YW5hIEJvdC5cbiAgICAvLyB2YXIgbW9kZWwgPSBzZW5zaXRpdmUubW9kZWx1cmw7XG4gICAgLy8gdmFyIG1vZGVsID0gJ2h0dHBzOi8vYXBpLnByb2plY3RveGZvcmQuYWkvbHVpcy92Mi4wL2FwcHMvYzQxM2IyZWYtMzgyYy00NWJkLThmZjAtZjc2ZDYwZTJhODIxP3N1YnNjcmlwdGlvbi1rZXk9YzIxMzk4YjU5ODBhNGNlMDlmNDc0YmJmZWU5M2I4OTImcT0nXG4gICAgdmFyIHJlY29nbml6ZXIgPSBuZXcgU2ltcGxlUmVjb2duaXplcigpOyAvLyBidWlsZGVyLkx1aXNSZWNvZ25pemVyKG1vZGVsKTtcbiAgICB2YXIgZGlhbG9nID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFtyZWNvZ25pemVyXSB9KTtcbiAgICAvLyBkaWFsb2cub25CZWdpbihmdW5jdGlvbihzZXNzaW9uLGFyZ3MpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcImJlZ2lubmluZyAuLi5cIilcbiAgICAvLyBzZXNzaW9uLmRpYWxvZ0RhdGEucmV0cnlQcm9tcHQgPSBhcmdzICYmIGFyZ3MucmV0cnlQcm9tcHQgfHwgXCJJIGFtIHNvcnJ5XCJcbiAgICAvLyBzZXNzaW9uLnNlbmQoXCJXaGF0IGRvIHlvdSB3YW50P1wiKVxuICAgIC8vXG4gICAgLy8gfSlcbiAgICB2YXIgZGlhbG9nVXBEb3duID0gbmV3IGJ1aWxkZXIuSW50ZW50RGlhbG9nKHsgcmVjb2duaXplcnM6IFtuZXcgU2ltcGxlVXBEb3duUmVjb2duaXplcigpXSB9KTtcbiAgICBib3QuZGlhbG9nKCcvdXBkb3duJywgZGlhbG9nVXBEb3duKTtcbiAgICBkaWFsb2dVcERvd24ub25CZWdpbihmdW5jdGlvbiAoc2Vzc2lvbikge1xuICAgICAgICBzZXNzaW9uLnNlbmQoXCJIaSB0aGVyZSwgdXBkb3duIGlzIHdhaXRpbmcgZm9yIHlvdVwiKTtcbiAgICB9KTtcbiAgICBkaWFsb2dVcERvd24ubWF0Y2hlcygnaW50ZW50LnVwJywgW1xuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IGFyZ3MgfHwge307XG4gICAgICAgICAgICBidWlsZGVyLlByb21wdHMudGV4dChzZXNzaW9uLCAneW91IHdhbnQgdG8gZ28gdXAnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSByZXN1bHRzLnJlcG9uc2U7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoeyByZXNwb25zZTogc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyB9KTtcbiAgICAgICAgfVxuICAgIF0pO1xuICAgIGRpYWxvZ1VwRG93bi5tYXRjaGVzKCdpbnRlbnQuZG93bicsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ3lvdSB3YW50IHRvIGdvIGRvd24hJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gLTE7IC8vIHJlc3VsdHMucmVwb25zZTtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZW5kRGlhbG9nV2l0aFJlc3VsdCh7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2U6IHsgcmVzOiBcImRvd25cIiwgdTogc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIF0pO1xuICAgIGJvdC5kaWFsb2coJy90cmFpbicsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uZGlhbGdvRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ0RvIHlvdSB3YW50IHRvIHRyYWluIG1lJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzLCBuZXh0KSB7XG4gICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuYWJjID0gcmVzdWx0cy5yZXBvbnNlO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgICAgICAgc2Vzc2lvbi5lbmREaWFsb2dXaXRoUmVzdWx0KHsgcmVzcG9uc2U6IHNlc3Npb24uRGlhbG9nRGF0YS5hYmMgfSk7XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBib3QuZGlhbG9nKCcvJywgZGlhbG9nKTtcbiAgICBkaWFsb2cubWF0Y2hlcygnU2hvd0VudGl0eScsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHZhciBpc0NvbWJpbmVkSW5kZXggPSB7fTtcbiAgICAgICAgICAgIHZhciBvTmV3RW50aXR5O1xuICAgICAgICAgICAgLy8gZnVzZSBlbnRpdGllc1xuICAgICAgICAgICAgdmFyIGNvbWJpbmVkRW50aXRpZXMgPSBhcmdzLmVudGl0aWVzLm1hcChmdW5jdGlvbiAob0VudGl0eSwgaUluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzQ29tYmluZWRJbmRleFtpSW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBpID0gaUluZGV4ICsgMTtcbiAgICAgICAgICAgICAgICBvTmV3RW50aXR5ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb0VudGl0eSk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGkgPCBhcmdzLmVudGl0aWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb05leHQgPSBhcmdzLmVudGl0aWVzW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAob05leHQudHlwZSA9PT0gb0VudGl0eS50eXBlICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAob05leHQuc3RhcnRJbmRleCA9PT0gKG9OZXdFbnRpdHkuZW5kSW5kZXggKyAxKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9OZXh0LnN0YXJ0SW5kZXggPT09IChvTmV3RW50aXR5LmVuZEluZGV4ICsgMikpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3BhY2VkID0gb05leHQuc3RhcnRJbmRleCA9PT0gKG9OZXdFbnRpdHkuZW5kSW5kZXggKyAyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tYmluZWRJbmRleFtpXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBvTmV3RW50aXR5LmVudGl0eSA9IG9OZXdFbnRpdHkuZW50aXR5ICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoc3BhY2VkID8gJyAnIDogJycpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvTmV4dC5lbnRpdHk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvTmV3RW50aXR5LmVuZEluZGV4ID0gb05leHQuZW5kSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICBpID0gaSArIDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpID0gYXJncy5lbnRpdGllcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IC8vIHdoaWxlXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9OZXdFbnRpdHk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU2hvdyBFbnRpdHlcIik7XG4gICAgICAgICAgICBjb21iaW5lZEVudGl0aWVzID0gY29tYmluZWRFbnRpdGllcy5maWx0ZXIoZnVuY3Rpb24gKG9FbnRpdHkpIHsgcmV0dXJuIG9FbnRpdHkgIT09IHVuZGVmaW5lZDsgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygncmF3OiAnICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcyksIHVuZGVmaW5lZCwgMik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29tYmluZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShjb21iaW5lZEVudGl0aWVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICB2YXIgc3lzdGVtSWQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnU3lzdGVtSWQnKTtcbiAgICAgICAgICAgICAgICAgIHZhciBjbGllbnQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnY2xpZW50Jyk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3lzdGVtT2JqZWN0SWQgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnc3lzdGVtT2JqZWN0SWQnKSB8fFxuICAgICAgICAgICAgICAgICAgICBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShjb21iaW5lZEVudGl0aWVzLCAnU3lzdGVtT2JqZWN0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ2J1aWx0aW4ubnVtYmVyJyk7XG4gICAgICAgICAgICAgICAgICB2YXIgc3lzdGVtT2JqZWN0Q2F0ZWdvcnkgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnU3lzdGVtT2JqZWN0Q2F0ZWdvcnknKTtcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICBzZXNzaW9uLmRpYWxvZ0RhdGEuc3lzdGVtID0ge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1JZDogc3lzdGVtSWQsXG4gICAgICAgICAgICAgICAgICAgIGNsaWVudDogY2xpZW50XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICB2YXIgc1N5c3RlbUlkID0gc3lzdGVtSWQgJiYgc3lzdGVtSWQuZW50aXR5O1xuICAgICAgICAgICAgICAgICAgdmFyIHNDbGllbnQgPSBjbGllbnQgJiYgY2xpZW50LmVudGl0eTtcbiAgICAgICAgICAgICAgICAgIHZhciBzc3lzdGVtT2JqZWN0SWQgPSBzeXN0ZW1PYmplY3RJZCAmJiBzeXN0ZW1PYmplY3RJZC5lbnRpdHk7XG4gICAgICAgICAgICAgICAgICB2YXIgc1N5c3RlbU9iamVjdENhdGVnb3J5ID0gc3lzdGVtT2JqZWN0Q2F0ZWdvcnkgJiYgc3lzdGVtT2JqZWN0Q2F0ZWdvcnkuZW50aXR5O1xuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTaG93IGVudGl0aWVzOiAnICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ1Nob3dpbmcgZW50aXR5IC4uLicpO1xuICAgICAgICAgICAgLy8gIGNvbnNvbGUubG9nKFwic2hvdyBlbnRpdHksIFNob3cgc2Vzc2lvbiA6IFwiICsgSlNPTi5zdHJpbmdpZnkoc2Vzc2lvbikpXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIlNob3cgZW50aXR5IDogXCIgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzKSlcbiAgICAgICAgfVxuICAgIF0pO1xuICAgIGRpYWxvZy5tYXRjaGVzKCd3cm9uZycsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIHNlc3Npb24uYmVnaW5EaWFsb2coJy91cGRvd24nLCBzZXNzaW9uLnVzZXJEYXRhLmNvdW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgICAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICAgICAgICAgIHNlc3Npb24uc2VuZChcImJhY2sgZnJvbSB3cm9uZyA6IFwiICsgSlNPTi5zdHJpbmdpZnkocmVzdWx0cykpO1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgICAgICAgc2Vzc2lvbi5zZW5kKCdlbmQgb2Ygd3JvbmcnKTtcbiAgICAgICAgfVxuICAgIF0pO1xuICAgIGRpYWxvZy5tYXRjaGVzKCdleGl0JywgW1xuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgYXJncywgbmV4dCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2V4aXQgOicpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2V4aXQnICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcykpO1xuICAgICAgICB9XG4gICAgXSk7XG4gICAgLy8gQWRkIGludGVudCBoYW5kbGVyc1xuICAgIGRpYWxvZy5tYXRjaGVzKCd0cmFpbicsIFtcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cmFpbicpO1xuICAgICAgICAgICAgLy8gUmVzb2x2ZSBhbmQgc3RvcmUgYW55IGVudGl0aWVzIHBhc3NlZCBmcm9tIExVSVMuXG4gICAgICAgICAgICB2YXIgdGl0bGUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIuZmluZEVudGl0eShhcmdzLmVudGl0aWVzLCAnYnVpbHRpbi5hbGFybS50aXRsZScpO1xuICAgICAgICAgICAgdmFyIHRpbWUgPSBidWlsZGVyLkVudGl0eVJlY29nbml6ZXIucmVzb2x2ZVRpbWUoYXJncy5lbnRpdGllcyk7XG4gICAgICAgICAgICB2YXIgYWxhcm0gPSBzZXNzaW9uLmRpYWxvZ0RhdGEuYWxhcm0gPSB7XG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlID8gdGl0bGUuZW50aXR5IDogbnVsbCxcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IHRpbWUgPyB0aW1lLmdldFRpbWUoKSA6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBQcm9tcHQgZm9yIHRpdGxlXG4gICAgICAgICAgICBpZiAoIWFsYXJtLnRpdGxlKSB7XG4gICAgICAgICAgICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ1doYXQgZmFjdCB3b3VsZCB5b3UgbGlrZSB0byB0cmFpbj8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMsIG5leHQpIHtcbiAgICAgICAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLnJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYWxhcm0udGl0bGUgPSByZXN1bHRzLnJlc3BvbnNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUHJvbXB0IGZvciB0aW1lICh0aXRsZSB3aWxsIGJlIGJsYW5rIGlmIHRoZSB1c2VyIHNhaWQgY2FuY2VsKVxuICAgICAgICAgICAgaWYgKGFsYXJtLnRpdGxlICYmICFhbGFybS50aW1lc3RhbXApIHtcbiAgICAgICAgICAgICAgICBidWlsZGVyLlByb21wdHMudGltZShzZXNzaW9uLCAnV2hhdCB0aW1lIHdvdWxkIHlvdSBsaWtlIHRvIHNldCB0aGUgYWxhcm0gZm9yPycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGltZSA9IGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5yZXNvbHZlVGltZShbcmVzdWx0cy5yZXNwb25zZV0pO1xuICAgICAgICAgICAgICAgIGFsYXJtLnRpbWVzdGFtcCA9IHRpbWUgPyB0aW1lLmdldFRpbWUoKSA6IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBTZXQgdGhlIGFsYXJtIChpZiB0aXRsZSBvciB0aW1lc3RhbXAgaXMgYmxhbmsgdGhlIHVzZXIgc2FpZCBjYW5jZWwpXG4gICAgICAgICAgICBpZiAoYWxhcm0udGl0bGUgJiYgYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgICAgICAgICAgLy8gU2F2ZSBhZGRyZXNzIG9mIHdobyB0byBub3RpZnkgYW5kIHdyaXRlIHRvIHNjaGVkdWxlci5cbiAgICAgICAgICAgICAgICBhbGFybS5hZGRyZXNzID0gc2Vzc2lvbi5tZXNzYWdlLmFkZHJlc3M7XG4gICAgICAgICAgICAgICAgYWxhcm1zW2FsYXJtLnRpdGxlXSA9IGFsYXJtO1xuICAgICAgICAgICAgICAgIC8vIFNlbmQgY29uZmlybWF0aW9uIHRvIHVzZXJcbiAgICAgICAgICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKGFsYXJtLnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgdmFyIGlzQU0gPSBkYXRlLmdldEhvdXJzKCkgPCAxMjtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ0NyZWF0aW5nIGFsYXJtIG5hbWVkIFwiJXNcIiBmb3IgJWQvJWQvJWQgJWQ6JTAyZCVzJywgYWxhcm0udGl0bGUsIGRhdGUuZ2V0TW9udGgoKSArIDEsIGRhdGUuZ2V0RGF0ZSgpLCBkYXRlLmdldEZ1bGxZZWFyKCksIGlzQU0gPyBkYXRlLmdldEhvdXJzKCkgOiBkYXRlLmdldEhvdXJzKCkgLSAxMiwgZGF0ZS5nZXRNaW51dGVzKCksIGlzQU0gPyAnYW0nIDogJ3BtJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnNlbmQoJ09rLi4uIG5vIHByb2JsZW0uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICBdKTtcbiAgICBkaWFsb2cub25EZWZhdWx0KGJ1aWxkZXIuRGlhbG9nQWN0aW9uLnNlbmQoJ0lcXCdtIHNvcnJ5IEkgZGlkblxcJ3QgdW5kZXJzdGFuZC4gSSBjYW4gb25seSBzaG93IHN0YXJ0IGFuZCByaW5nJykpO1xuICAgIC8vIFZlcnkgc2ltcGxlIGFsYXJtIHNjaGVkdWxlclxuICAgIHZhciBhbGFybXMgPSB7fTtcbiAgICBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGFsYXJtcykge1xuICAgICAgICAgICAgdmFyIGFsYXJtID0gYWxhcm1zW2tleV07XG4gICAgICAgICAgICBpZiAobm93ID49IGFsYXJtLnRpbWVzdGFtcCkge1xuICAgICAgICAgICAgICAgIHZhciBtc2cgPSBuZXcgYnVpbGRlci5NZXNzYWdlKClcbiAgICAgICAgICAgICAgICAgICAgLmFkZHJlc3MoYWxhcm0uYWRkcmVzcylcbiAgICAgICAgICAgICAgICAgICAgLnRleHQoJ0hlcmVcXCdzIHlvdXIgXFwnJXNcXCcgYWxhcm0uJywgYWxhcm0udGl0bGUpO1xuICAgICAgICAgICAgICAgIGJvdC5zZW5kKG1zZyk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGFsYXJtc1trZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSwgMTUwMDApO1xufVxuaWYgKG1vZHVsZSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0ge1xuICAgICAgICBtYWtlQm90OiBtYWtlQm90XG4gICAgfTtcbn1cbiIsIi8qKlxuICogVGhlIGJvdCBpbXBsZW1lbnRhdGlvblxuICpcbiAqIEluc3RhbnRpYXRlIGFwc3NpbmcgYSBjb25uZWN0b3IgdmlhXG4gKiBtYWtlQm90XG4gKlxuICovXG5cbi8vIHZhciBleGVjID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNcblxuLy8gdmFyIHJlcXVlc3QyID0gcmVxdWlyZSgncmVxdWVzdC1kZWZhdWx0cycpXG4vLyB2YXIgcmVxdWVzdCA9IHJlcXVlc3QyLmdsb2JhbERlZmF1bHRzKHtcbi8vICAncHJveHknOiAnaHR0cDovL3Byb3h5OjgwODAnLFxuLy8gICdodHRwcy1wcm94eSc6ICdodHRwczovL3Byb3h5OjgwODAnXG4vLyB9KVxuXG5pbXBvcnQgKiBhcyBidWlsZGVyIGZyb20gJ2JvdGJ1aWxkZXInO1xuLy92YXIgYnVpbGRlciA9IHJlcXVpcmUoJ2JvdGJ1aWxkZXInKTtcblxudmFyIGRpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9tYXRjaC9kaXNwYXRjaGVyLmpzJykuZGlzcGF0Y2hlcjtcblxuXG5jbGFzcyBTaW1wbGVSZWNvZ25pemVyIGltcGxlbWVudHMgYnVpbGRlci5JSW50ZW50UmVjb2duaXplciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuXG4gIH1cblxuICByZWNvZ25pemUoY29udGV4dDogYnVpbGRlci5JUmVjb2duaXplQ29udGV4dCwgY2FsbGJhY2s6IChlcnI6IEVycm9yLCByZXN1bHQ6IGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXJSZXN1bHQpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB2YXIgdSA9IHt9IGFzIGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXJSZXN1bHQ7XG5cbiAgICBjb25zb2xlLmxvZyhcInJlY29nbml6aW5nIFwiICsgY29udGV4dC5tZXNzYWdlLnRleHQpO1xuICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwic3RhcnRcIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcIlNob3dFbnRpdHlcIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJzdGFydCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwidHJhaW5cIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcInRyYWluXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwidHJhaW4gXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJsZWFyblwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwibGVhcm5cIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS50eXBlID0gXCJ0cmFpbkZhY3RcIjtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInRyYWluIFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiaGVscFwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwiaGVscFwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcInRyYWluIFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwiZXhpdFwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwiZXhpdFwiO1xuICAgICAgdS5zY29yZSA9IDAuOTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMztcbiAgICAgIHUuZW50aXRpZXMgPSBbZTFdO1xuICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCB1KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgIGlmIChjb250ZXh0Lm1lc3NhZ2UudGV4dC5pbmRleE9mKFwid3JvbmdcIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcIndyb25nXCI7XG4gICAgICB1LnNjb3JlID0gMC45O1xuICAgICAgdmFyIGUxID0ge30gYXMgYnVpbGRlci5JRW50aXR5O1xuICAgICAgZTEuc3RhcnRJbmRleCA9IFwiZXhpdCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygncmVjb2duaXppbmcgbm90aGluZycpO1xuICAgICAgdS5pbnRlbnQgPSBcIk5vbmVcIjtcbiAgICAgIHUuc2NvcmUgPSAwLjE7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJleGl0IFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjE7XG4gICAgICB1LmVudGl0aWVzID0gW107XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICB9XG59XG5cblxuY2xhc3MgU2ltcGxlVXBEb3duUmVjb2duaXplciBpbXBsZW1lbnRzIGJ1aWxkZXIuSUludGVudFJlY29nbml6ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcblxuICB9XG5cbiAgcmVjb2duaXplKGNvbnRleHQ6IGJ1aWxkZXIuSVJlY29nbml6ZUNvbnRleHQsIGNhbGxiYWNrOiAoZXJyOiBFcnJvciwgcmVzdWx0OiBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdmFyIHUgPSB7fSBhcyBidWlsZGVyLklJbnRlbnRSZWNvZ25pemVyUmVzdWx0O1xuXG4gICAgY29uc29sZS5sb2coXCJyZWNvZ25pemluZyBcIiArIGNvbnRleHQubWVzc2FnZS50ZXh0KTtcbiAgICBpZiAoY29udGV4dC5tZXNzYWdlLnRleHQuaW5kZXhPZihcImRvd25cIikgPj0gMCkge1xuICAgICAgdS5pbnRlbnQgPSBcImRvd25cIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJzdGFydCBcIi5sZW5ndGg7XG4gICAgICBlMS5lbmRJbmRleCA9IGNvbnRleHQubWVzc2FnZS50ZXh0Lmxlbmd0aDtcbiAgICAgIGUxLnNjb3JlID0gMC4zO1xuICAgICAgdS5lbnRpdGllcyA9IFtlMV07XG4gICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAgaWYgKGNvbnRleHQubWVzc2FnZS50ZXh0LmluZGV4T2YoXCJ1cFwiKSA+PSAwKSB7XG4gICAgICB1LmludGVudCA9IFwidXBcIjtcbiAgICAgIHUuc2NvcmUgPSAwLjk7XG4gICAgICB2YXIgZTEgPSB7fSBhcyBidWlsZGVyLklFbnRpdHk7XG4gICAgICBlMS5zdGFydEluZGV4ID0gXCJ1cFwiLmxlbmd0aDtcbiAgICAgIGUxLmVuZEluZGV4ID0gY29udGV4dC5tZXNzYWdlLnRleHQubGVuZ3RoO1xuICAgICAgZTEuc2NvcmUgPSAwLjM7XG4gICAgICB1LmVudGl0aWVzID0gW2UxXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdyZWNvZ25pemluZyBub3RoaW5nJyk7XG4gICAgICB1LmludGVudCA9IFwiTm9uZVwiO1xuICAgICAgdS5zY29yZSA9IDAuMTtcbiAgICAgIHZhciBlMSA9IHt9IGFzIGJ1aWxkZXIuSUVudGl0eTtcbiAgICAgIGUxLnN0YXJ0SW5kZXggPSBcImV4aXQgXCIubGVuZ3RoO1xuICAgICAgZTEuZW5kSW5kZXggPSBjb250ZXh0Lm1lc3NhZ2UudGV4dC5sZW5ndGg7XG4gICAgICBlMS5zY29yZSA9IDAuMTtcbiAgICAgIHUuZW50aXRpZXMgPSBbXTtcbiAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdSk7XG4gIH1cbn1cblxuY29uc3QgQW55T2JqZWN0ID0gT2JqZWN0IGFzIGFueTtcbi8vIGdsb2JhbFR1bm5lbC5pbml0aWFsaXplKHtcbi8vICBob3N0OiAncHJveHkuZXh4eGFtcGxlLmNvbScsXG4vLyAgcG9ydDogODA4MFxuLy8gfSlcblxuLy8gQ3JlYXRlIGJvdCBhbmQgYmluZCB0byBjb25zb2xlXG4vLyB2YXIgY29ubmVjdG9yID0gbmV3IGh0bWxjb25uZWN0b3IuSFRNTENvbm5lY3RvcigpXG5cbi8vIGNvbm5lY3Rvci5zZXRBbnN3ZXJIb29rKGZ1bmN0aW9uIChzQW5zd2VyKSB7XG4vLyAgY29uc29sZS5sb2coJ0dvdCBhbnN3ZXIgOiAnICsgc0Fuc3dlciArICdcXG4nKVxuLy8gfSlcblxudmFyIGJvdDtcbi8vIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuLy8gICBjb25uZWN0b3IucHJvY2Vzc01lc3NhZ2UoJ3N0YXJ0IHVuaXQgdGVzdCBBQkMgJylcbi8vIH0sIDUwMDApXG5cbi8qKlxuICogQ29uc3RydWN0IGEgYm90XG4gKiBAcGFyYW0gY29ubmVjdG9yIHtDb25uZWN0b3J9IHRoZSBjb25uZWN0b3IgdG8gdXNlXG4gKiBIVE1MQ29ubmVjdG9yXG4gKiBvciBjb25uZWN0b3IgPSBuZXcgYnVpbGRlci5Db25zb2xlQ29ubmVjdG9yKCkubGlzdGVuKClcbiAqL1xuZnVuY3Rpb24gbWFrZUJvdChjb25uZWN0b3IpIHtcbiAgYm90ID0gbmV3IGJ1aWxkZXIuVW5pdmVyc2FsQm90KGNvbm5lY3Rvcik7XG5cbiAgLy8gQ3JlYXRlIExVSVMgcmVjb2duaXplciB0aGF0IHBvaW50cyBhdCBvdXIgbW9kZWwgYW5kIGFkZCBpdCBhcyB0aGUgcm9vdCAnLycgZGlhbG9nIGZvciBvdXIgQ29ydGFuYSBCb3QuXG4gIC8vIHZhciBtb2RlbCA9IHNlbnNpdGl2ZS5tb2RlbHVybDtcbiAgLy8gdmFyIG1vZGVsID0gJ2h0dHBzOi8vYXBpLnByb2plY3RveGZvcmQuYWkvbHVpcy92Mi4wL2FwcHMvYzQxM2IyZWYtMzgyYy00NWJkLThmZjAtZjc2ZDYwZTJhODIxP3N1YnNjcmlwdGlvbi1rZXk9YzIxMzk4YjU5ODBhNGNlMDlmNDc0YmJmZWU5M2I4OTImcT0nXG4gIHZhciByZWNvZ25pemVyID0gbmV3IFNpbXBsZVJlY29nbml6ZXIoKTsgLy8gYnVpbGRlci5MdWlzUmVjb2duaXplcihtb2RlbCk7XG5cbiAgdmFyIGRpYWxvZyA9IG5ldyBidWlsZGVyLkludGVudERpYWxvZyh7IHJlY29nbml6ZXJzOiBbcmVjb2duaXplcl0gfSk7XG4gIC8vIGRpYWxvZy5vbkJlZ2luKGZ1bmN0aW9uKHNlc3Npb24sYXJncykge1xuICAvLyBjb25zb2xlLmxvZyhcImJlZ2lubmluZyAuLi5cIilcbiAgLy8gc2Vzc2lvbi5kaWFsb2dEYXRhLnJldHJ5UHJvbXB0ID0gYXJncyAmJiBhcmdzLnJldHJ5UHJvbXB0IHx8IFwiSSBhbSBzb3JyeVwiXG4gIC8vIHNlc3Npb24uc2VuZChcIldoYXQgZG8geW91IHdhbnQ/XCIpXG4gIC8vXG4gIC8vIH0pXG5cbiAgdmFyIGRpYWxvZ1VwRG93biA9IG5ldyBidWlsZGVyLkludGVudERpYWxvZyh7IHJlY29nbml6ZXJzOiBbIG5ldyBTaW1wbGVVcERvd25SZWNvZ25pemVyKCldIH0pO1xuXG5cbiAgYm90LmRpYWxvZygnL3VwZG93bicsIGRpYWxvZ1VwRG93bik7XG4gIGRpYWxvZ1VwRG93bi5vbkJlZ2luKGZ1bmN0aW9uKHNlc3Npb24pIHtcbiAgICBzZXNzaW9uLnNlbmQoXCJIaSB0aGVyZSwgdXBkb3duIGlzIHdhaXRpbmcgZm9yIHlvdVwiKTtcbiAgfSlcblxuICBkaWFsb2dVcERvd24ubWF0Y2hlcygnaW50ZW50LnVwJywgW1xuICAgIGZ1bmN0aW9uKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ3lvdSB3YW50IHRvIGdvIHVwJyk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IHJlc3VsdHMucmVwb25zZTtcbiAgICAgIG5leHQoKTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoeyByZXNwb25zZSA6IHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgfSk7XG4gICAgfVxuICBdXG4gICk7XG5cbiAgZGlhbG9nVXBEb3duLm1hdGNoZXMoJ2ludGVudC5kb3duJywgW1xuICAgIGZ1bmN0aW9uKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ3lvdSB3YW50IHRvIGdvIGRvd24hJyk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IC0xOyAvLyByZXN1bHRzLnJlcG9uc2U7XG4gICAgICBuZXh0KCk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgc2Vzc2lvbi5lbmREaWFsb2dXaXRoUmVzdWx0KHtcbiAgICAgICByZXNwb25zZSA6IHsgcmVzIDogXCJkb3duXCIgLCB1IDogc2Vzc2lvbi5kaWFsb2dEYXRhLmFiY30gfSk7XG4gICAgfVxuICBdXG4gICk7XG5cbiAgYm90LmRpYWxvZygnL3RyYWluJywgW1xuICAgIGZ1bmN0aW9uKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIHNlc3Npb24uZGlhbGdvRGF0YS5hYmMgPSBhcmdzIHx8IHt9O1xuICAgICAgYnVpbGRlci5Qcm9tcHRzLnRleHQoc2Vzc2lvbiwgJ0RvIHlvdSB3YW50IHRvIHRyYWluIG1lJyk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgc2Vzc2lvbi5kaWFsb2dEYXRhLmFiYyA9IHJlc3VsdHMucmVwb25zZTtcbiAgICB9LFxuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCByZXN1bHRzKSB7XG4gICAgICBzZXNzaW9uLmVuZERpYWxvZ1dpdGhSZXN1bHQoeyByZXNwb25zZSA6IHNlc3Npb24uRGlhbG9nRGF0YS5hYmMgfSk7XG4gICAgfVxuICBdKTtcblxuXG4gIGJvdC5kaWFsb2coJy8nLCBkaWFsb2cpO1xuXG4gIGRpYWxvZy5tYXRjaGVzKCdTaG93RW50aXR5JywgW1xuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICB2YXIgaXNDb21iaW5lZEluZGV4ID0ge307XG4gICAgICB2YXIgb05ld0VudGl0eTtcbiAgICAgIC8vIGZ1c2UgZW50aXRpZXNcbiAgICAgIHZhciBjb21iaW5lZEVudGl0aWVzID0gYXJncy5lbnRpdGllcy5tYXAoZnVuY3Rpb24gKG9FbnRpdHksIGlJbmRleCkge1xuICAgICAgICBpZiAoaXNDb21iaW5lZEluZGV4W2lJbmRleF0pIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpID0gaUluZGV4ICsgMTtcbiAgICAgICAgb05ld0VudGl0eSA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9FbnRpdHkpO1xuXG4gICAgICAgIHdoaWxlIChpIDwgYXJncy5lbnRpdGllcy5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgb05leHQgPSBhcmdzLmVudGl0aWVzW2ldO1xuICAgICAgICAgIGlmIChvTmV4dC50eXBlID09PSBvRW50aXR5LnR5cGUgJiZcbiAgICAgICAgICAgIChvTmV4dC5zdGFydEluZGV4ID09PSAob05ld0VudGl0eS5lbmRJbmRleCArIDEpIHx8XG4gICAgICAgICAgICAgIG9OZXh0LnN0YXJ0SW5kZXggPT09IChvTmV3RW50aXR5LmVuZEluZGV4ICsgMilcbiAgICAgICAgICAgICkpIHtcbiAgICAgICAgICAgIHZhciBzcGFjZWQgPSBvTmV4dC5zdGFydEluZGV4ID09PSAob05ld0VudGl0eS5lbmRJbmRleCArIDIpO1xuICAgICAgICAgICAgaXNDb21iaW5lZEluZGV4W2ldID0gdHJ1ZTtcbiAgICAgICAgICAgIG9OZXdFbnRpdHkuZW50aXR5ID0gb05ld0VudGl0eS5lbnRpdHkgK1xuICAgICAgICAgICAgICAoc3BhY2VkID8gJyAnIDogJycpICtcbiAgICAgICAgICAgICAgb05leHQuZW50aXR5O1xuICAgICAgICAgICAgb05ld0VudGl0eS5lbmRJbmRleCA9IG9OZXh0LmVuZEluZGV4O1xuICAgICAgICAgICAgaSA9IGkgKyAxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpID0gYXJncy5lbnRpdGllcy5sZW5ndGg7XG4gICAgICAgICAgfVxuICAgICAgICB9IC8vIHdoaWxlXG4gICAgICAgIHJldHVybiBvTmV3RW50aXR5O1xuICAgICAgfSk7XG4gICAgICBjb25zb2xlLmxvZyhcIlNob3cgRW50aXR5XCIpO1xuICAgICAgY29tYmluZWRFbnRpdGllcyA9IGNvbWJpbmVkRW50aXRpZXMuZmlsdGVyKGZ1bmN0aW9uIChvRW50aXR5KSB7IHJldHVybiBvRW50aXR5ICE9PSB1bmRlZmluZWQ7IH0pO1xuICAgICAgY29uc29sZS5sb2coJ3JhdzogJyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpLCB1bmRlZmluZWQsIDIpO1xuICAgICAgY29uc29sZS5sb2coJ2NvbWJpbmVkOiAnICsgSlNPTi5zdHJpbmdpZnkoY29tYmluZWRFbnRpdGllcywgdW5kZWZpbmVkLCAyKSk7XG4vKlxuICAgICAgdmFyIHN5c3RlbUlkID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ1N5c3RlbUlkJyk7XG4gICAgICB2YXIgY2xpZW50ID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ2NsaWVudCcpO1xuICAgICAgdmFyIHN5c3RlbU9iamVjdElkID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ3N5c3RlbU9iamVjdElkJykgfHxcbiAgICAgICAgYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoY29tYmluZWRFbnRpdGllcywgJ1N5c3RlbU9iamVjdCcpIHx8XG4gICAgICAgIGJ1aWxkZXIuRW50aXR5UmVjb2duaXplci5maW5kRW50aXR5KGNvbWJpbmVkRW50aXRpZXMsICdidWlsdGluLm51bWJlcicpO1xuICAgICAgdmFyIHN5c3RlbU9iamVjdENhdGVnb3J5ID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ1N5c3RlbU9iamVjdENhdGVnb3J5Jyk7XG5cbiAgICAgIHNlc3Npb24uZGlhbG9nRGF0YS5zeXN0ZW0gPSB7XG4gICAgICAgIHN5c3RlbUlkOiBzeXN0ZW1JZCxcbiAgICAgICAgY2xpZW50OiBjbGllbnRcbiAgICAgIH07XG4qL1xuLypcbiAgICAgIHZhciBzU3lzdGVtSWQgPSBzeXN0ZW1JZCAmJiBzeXN0ZW1JZC5lbnRpdHk7XG4gICAgICB2YXIgc0NsaWVudCA9IGNsaWVudCAmJiBjbGllbnQuZW50aXR5O1xuICAgICAgdmFyIHNzeXN0ZW1PYmplY3RJZCA9IHN5c3RlbU9iamVjdElkICYmIHN5c3RlbU9iamVjdElkLmVudGl0eTtcbiAgICAgIHZhciBzU3lzdGVtT2JqZWN0Q2F0ZWdvcnkgPSBzeXN0ZW1PYmplY3RDYXRlZ29yeSAmJiBzeXN0ZW1PYmplY3RDYXRlZ29yeS5lbnRpdHk7XG4qL1xuICAgICAgY29uc29sZS5sb2coJ1Nob3cgZW50aXRpZXM6ICcgKyBKU09OLnN0cmluZ2lmeShhcmdzLmVudGl0aWVzLCB1bmRlZmluZWQsIDIpKTtcblxuICAgICAgc2Vzc2lvbi5zZW5kKCdTaG93aW5nIGVudGl0eSAuLi4nKTtcbiAgICAgIC8vICBjb25zb2xlLmxvZyhcInNob3cgZW50aXR5LCBTaG93IHNlc3Npb24gOiBcIiArIEpTT04uc3RyaW5naWZ5KHNlc3Npb24pKVxuICAgICAgLy8gY29uc29sZS5sb2coXCJTaG93IGVudGl0eSA6IFwiICsgSlNPTi5zdHJpbmdpZnkoYXJncy5lbnRpdGllcykpXG4gICAgfVxuICBdKTtcblxuICBkaWFsb2cubWF0Y2hlcygnd3JvbmcnLCAgW1xuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgIHNlc3Npb24uYmVnaW5EaWFsb2coJy91cGRvd24nLCBzZXNzaW9uLnVzZXJEYXRhLmNvdW50ICk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgc2Vzc2lvbi5zZW5kKFwiYmFjayBmcm9tIHdyb25nIDogXCIgKyBKU09OLnN0cmluZ2lmeShyZXN1bHRzKSk7XG4gICAgICBuZXh0KCk7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cykge1xuICAgICAgICBzZXNzaW9uLnNlbmQoJ2VuZCBvZiB3cm9uZycpO1xuICAgIH1cbiAgXSk7XG5cbiAgZGlhbG9nLm1hdGNoZXMoJ2V4aXQnLCBbXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIGFyZ3MsIG5leHQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdleGl0IDonKTtcbiAgICAgIGNvbnNvbGUubG9nKCdleGl0JyArIEpTT04uc3RyaW5naWZ5KGFyZ3MuZW50aXRpZXMpKTtcbiAgICB9XG4gIF0pO1xuXG4gIC8vIEFkZCBpbnRlbnQgaGFuZGxlcnNcbiAgZGlhbG9nLm1hdGNoZXMoJ3RyYWluJywgW1xuICAgIGZ1bmN0aW9uIChzZXNzaW9uLCBhcmdzLCBuZXh0KSB7XG4gICAgICBjb25zb2xlLmxvZygndHJhaW4nKTtcbiAgICAgIC8vIFJlc29sdmUgYW5kIHN0b3JlIGFueSBlbnRpdGllcyBwYXNzZWQgZnJvbSBMVUlTLlxuICAgICAgdmFyIHRpdGxlID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLmZpbmRFbnRpdHkoYXJncy5lbnRpdGllcywgJ2J1aWx0aW4uYWxhcm0udGl0bGUnKTtcbiAgICAgIHZhciB0aW1lID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLnJlc29sdmVUaW1lKGFyZ3MuZW50aXRpZXMpO1xuICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtID0ge1xuICAgICAgICB0aXRsZTogdGl0bGUgPyB0aXRsZS5lbnRpdHkgOiBudWxsLFxuICAgICAgICB0aW1lc3RhbXA6IHRpbWUgPyB0aW1lLmdldFRpbWUoKSA6IG51bGxcbiAgICAgIH07XG4gICAgICAvLyBQcm9tcHQgZm9yIHRpdGxlXG4gICAgICBpZiAoIWFsYXJtLnRpdGxlKSB7XG4gICAgICAgIGJ1aWxkZXIuUHJvbXB0cy50ZXh0KHNlc3Npb24sICdXaGF0IGZhY3Qgd291bGQgeW91IGxpa2UgdG8gdHJhaW4/Jyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVzdWx0cywgbmV4dCkge1xuICAgICAgdmFyIGFsYXJtID0gc2Vzc2lvbi5kaWFsb2dEYXRhLmFsYXJtO1xuICAgICAgaWYgKHJlc3VsdHMucmVzcG9uc2UpIHtcbiAgICAgICAgYWxhcm0udGl0bGUgPSByZXN1bHRzLnJlc3BvbnNlO1xuICAgICAgfVxuXG4gICAgICAvLyBQcm9tcHQgZm9yIHRpbWUgKHRpdGxlIHdpbGwgYmUgYmxhbmsgaWYgdGhlIHVzZXIgc2FpZCBjYW5jZWwpXG4gICAgICBpZiAoYWxhcm0udGl0bGUgJiYgIWFsYXJtLnRpbWVzdGFtcCkge1xuICAgICAgICBidWlsZGVyLlByb21wdHMudGltZShzZXNzaW9uLCAnV2hhdCB0aW1lIHdvdWxkIHlvdSBsaWtlIHRvIHNldCB0aGUgYWxhcm0gZm9yPycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZnVuY3Rpb24gKHNlc3Npb24sIHJlc3VsdHMpIHtcbiAgICAgIHZhciBhbGFybSA9IHNlc3Npb24uZGlhbG9nRGF0YS5hbGFybTtcbiAgICAgIGlmIChyZXN1bHRzLnJlc3BvbnNlKSB7XG4gICAgICAgIHZhciB0aW1lID0gYnVpbGRlci5FbnRpdHlSZWNvZ25pemVyLnJlc29sdmVUaW1lKFtyZXN1bHRzLnJlc3BvbnNlXSk7XG4gICAgICAgIGFsYXJtLnRpbWVzdGFtcCA9IHRpbWUgPyB0aW1lLmdldFRpbWUoKSA6IG51bGw7XG4gICAgICB9XG4gICAgICAvLyBTZXQgdGhlIGFsYXJtIChpZiB0aXRsZSBvciB0aW1lc3RhbXAgaXMgYmxhbmsgdGhlIHVzZXIgc2FpZCBjYW5jZWwpXG4gICAgICBpZiAoYWxhcm0udGl0bGUgJiYgYWxhcm0udGltZXN0YW1wKSB7XG4gICAgICAgIC8vIFNhdmUgYWRkcmVzcyBvZiB3aG8gdG8gbm90aWZ5IGFuZCB3cml0ZSB0byBzY2hlZHVsZXIuXG4gICAgICAgIGFsYXJtLmFkZHJlc3MgPSBzZXNzaW9uLm1lc3NhZ2UuYWRkcmVzcztcbiAgICAgICAgYWxhcm1zW2FsYXJtLnRpdGxlXSA9IGFsYXJtO1xuXG4gICAgICAgIC8vIFNlbmQgY29uZmlybWF0aW9uIHRvIHVzZXJcbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShhbGFybS50aW1lc3RhbXApO1xuICAgICAgICB2YXIgaXNBTSA9IGRhdGUuZ2V0SG91cnMoKSA8IDEyO1xuICAgICAgICBzZXNzaW9uLnNlbmQoJ0NyZWF0aW5nIGFsYXJtIG5hbWVkIFwiJXNcIiBmb3IgJWQvJWQvJWQgJWQ6JTAyZCVzJyxcbiAgICAgICAgICBhbGFybS50aXRsZSxcbiAgICAgICAgICBkYXRlLmdldE1vbnRoKCkgKyAxLCBkYXRlLmdldERhdGUoKSwgZGF0ZS5nZXRGdWxsWWVhcigpLFxuICAgICAgICAgIGlzQU0gPyBkYXRlLmdldEhvdXJzKCkgOiBkYXRlLmdldEhvdXJzKCkgLSAxMiwgZGF0ZS5nZXRNaW51dGVzKCksIGlzQU0gPyAnYW0nIDogJ3BtJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXNzaW9uLnNlbmQoJ09rLi4uIG5vIHByb2JsZW0uJyk7XG4gICAgICB9XG4gICAgfVxuICBdKTtcblxuICBkaWFsb2cub25EZWZhdWx0KGJ1aWxkZXIuRGlhbG9nQWN0aW9uLnNlbmQoJ0lcXCdtIHNvcnJ5IEkgZGlkblxcJ3QgdW5kZXJzdGFuZC4gSSBjYW4gb25seSBzaG93IHN0YXJ0IGFuZCByaW5nJykpO1xuXG4gIC8vIFZlcnkgc2ltcGxlIGFsYXJtIHNjaGVkdWxlclxuICB2YXIgYWxhcm1zID0ge307XG4gIHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgZm9yICh2YXIga2V5IGluIGFsYXJtcykge1xuICAgICAgdmFyIGFsYXJtID0gYWxhcm1zW2tleV07XG4gICAgICBpZiAobm93ID49IGFsYXJtLnRpbWVzdGFtcCkge1xuICAgICAgICB2YXIgbXNnID0gbmV3IGJ1aWxkZXIuTWVzc2FnZSgpXG4gICAgICAgICAgLmFkZHJlc3MoYWxhcm0uYWRkcmVzcylcbiAgICAgICAgICAudGV4dCgnSGVyZVxcJ3MgeW91ciBcXCclc1xcJyBhbGFybS4nLCBhbGFybS50aXRsZSk7XG4gICAgICAgIGJvdC5zZW5kKG1zZyk7XG4gICAgICAgIGRlbGV0ZSBhbGFybXNba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIDE1MDAwKTtcbn1cblxuaWYgKG1vZHVsZSkge1xuICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBtYWtlQm90OiBtYWtlQm90XG4gIH07XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
