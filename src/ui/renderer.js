'use strict';

/**
 * connect dispatcher
 * to HTML engine
 */

// var exec = require('child_process').exec

// globalTunnel.initialize({
//  host: 'proxy.exxxample.com',
//  port: 8080
// })

var botdialog = require('../bot/dialog');

var htmlconnector = require('./htmlconnector.js');
// Create bot and bind to console
var connector = new htmlconnector.HTMLConnector();

connector.setAnswerHook(function (sAnswer) {
  console.log('Got answer : ' + sAnswer + '\n');
});

botdialog.makeBot(connector);

module.exports = connector;