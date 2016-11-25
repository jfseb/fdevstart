// var globalTunnel = require('global-tunnel')

//  host: 'proxy.exxxample.com',
//  port: 8080
// })

var builder = require('botbuilder');

// Create bot and bind to console
var connector = new builder.ConsoleConnector().listen();

var botdialog = require('./gen/bot/dumbdialog.js');

botdialog.makeBot(connector);
