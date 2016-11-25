'use strict';

/**
 * The bot implementation
 *
 * Instantiate apssing a connector via
 * makeBot
 *
 */

// var exec = require('child_process').exec

// var request2 = require('request-defaults')
// var request = request2.globalDefaults({
//  'proxy': 'http://proxy:8080',
//  'https-proxy': 'https://proxy:8080'
// })

var builder = require('botbuilder');

var dispatcher = require('../match/dispatcher.js').dispatcher;
// globalTunnel.initialize({
//  host: 'proxy.exxxample.com',
//  port: 8080
// })

// Create bot and bind to console
// var connector = new htmlconnector.HTMLConnector()

// connector.setAnswerHook(function (sAnswer) {
//  console.log('Got answer : ' + sAnswer + '\n')
// })

var sensitive = require('../../sensitive/data.js');

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
  var model = sensitive.modelurl;
  // var model = 'https://api.projectoxford.ai/luis/v2.0/apps/c413b2ef-382c-45bd-8ff0-f76d60e2a821?subscription-key=c21398b5980a4ce09f474bbfee93b892&q='
  var recognizer = new builder.LuisRecognizer(model);

  var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
  // dialog.onBegin(function(session,args) {
  // console.log("beginning ...")
  // session.dialogData.retryPrompt = args && args.retryPrompt || "I am sorry"
  // session.send("What do you want?")
  //
  // })

  bot.dialog('/', dialog);

  dialog.matches(/builtin.intent.ringPerson/i, [function (session, args, next) {
    // console.log("Show session : " + JSON.stringify(session))
    console.log(JSON.stringify(args));
    next();
  }, function (session, args, next) {
    // console.log("Show session : " + JSON.stringify(session))
    console.log(JSON.stringify(args));
    next();
  }]);

  dialog.matches('ShowEntity', [function (session, args, next) {
    var isCombinedIndex = {};
    var oNewEntity;
    // fuse entities
    var combinedEntities = args.entities.map(function (oEntity, iIndex) {
      if (isCombinedIndex[iIndex]) {
        return undefined;
      }
      var i = iIndex + 1;
      oNewEntity = Object.assign({}, oEntity);

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

    combinedEntities = combinedEntities.filter(function (oEntity) {
      return oEntity !== undefined;
    });
    console.log('raw: ' + JSON.stringify(args.entities), undefined, 2);
    console.log('combined: ' + JSON.stringify(combinedEntities, undefined, 2));

    var systemId = builder.EntityRecognizer.findEntity(combinedEntities, 'SystemId');
    var client = builder.EntityRecognizer.findEntity(args.entities, 'client');
    var systemObjectId = builder.EntityRecognizer.findEntity(combinedEntities, 'systemObjectId') || builder.EntityRecognizer.findEntity(combinedEntities, 'SystemObject') || builder.EntityRecognizer.findEntity(combinedEntities, 'builtin.number');
    var systemObjectCategory = builder.EntityRecognizer.findEntity(args.entities, 'SystemObjectCategory');
    session.dialogData.system = {
      systemId: systemId,
      client: client
    };

    var sSystemId = systemId && systemId.entity;
    var sClient = client && client.entity;
    var ssystemObjectId = systemObjectId && systemObjectId.entity;
    var sSystemObjectCategory = systemObjectCategory && systemObjectCategory.entity;

    console.log('Show entities: ' + JSON.stringify(args.entities, undefined, 2));

    var sTool = null;
    // dirty hack:
    if (sSystemObjectCategory === 'unit' || sSystemObjectCategory === 'unit test') {
      sTool = null;
    }
    if (sSystemId && sSystemId.indexOf('system ') === 0) {
      sSystemId = sSystemId.substring('system '.length);
    }
    if (sSystemObjectCategory === 'catalog') {
      sTool = 'FLPD';
    }
    if (sSystemObjectCategory === 'group') {
      sTool = 'FLPD';
    }
    if (!ssystemObjectId && !sSystemObjectCategory) {
      sTool = 'FLP';
    }

    session.send('Showing entity "%s" of type "%s" in System "%s" client "%s" ',
    // Creating alarm named "%s" for %d/%d/%d %d:%02d%s',
    ssystemObjectId, sSystemObjectCategory, sSystemId, sClient);

    var u = dispatcher.execShowEntity({
      systemId: sSystemId,
      client: sClient,
      tool: sTool,
      systemObjectCategory: sSystemObjectCategory,
      systemObjectId: ssystemObjectId
    });
    if (u) {
      session.send(u);
    }
    //  console.log("show entity, Show session : " + JSON.stringify(session))
    // console.log("Show entity : " + JSON.stringify(args.entities))
  }]);

  dialog.matches('StartTransaction', [function (session, args, next) {
    console.log('Start Transaction session : ' + JSON.stringify(session));
    console.log('Show entity : ' + JSON.stringify(args.entities));
  }]);

  dialog.matches('ringperson', [function (session, args, next) {
    console.log('sringperson session : ' + JSON.stringify(session));
    console.log('ringperson' + JSON.stringify(args.entities));
  }]);

  // Add intent handlers
  dialog.matches('builtin.intent.alarm.set_alarm', [function (session, args, next) {
    console.log('builtin alarm');
    // Resolve and store any entities passed from LUIS.
    var title = builder.EntityRecognizer.findEntity(args.entities, 'builtin.alarm.title');
    var time = builder.EntityRecognizer.resolveTime(args.entities);
    var alarm = session.dialogData.alarm = {
      title: title ? title.entity : null,
      timestamp: time ? time.getTime() : null
    };

    // Prompt for title
    if (!alarm.title) {
      builder.Prompts.text(session, 'What would you like to call your alarm?');
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