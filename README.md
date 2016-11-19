# fdevstart

Sample app to identify links / apps and start them after textual, bot-like input


High Level Features:

* Simple Dialog system to integrate UI startup
* Built-in prompts for simple things like Yes/No, strings, numbers, enumerations.
* Built-in dialogs that utilize powerful AI frameworks like [LUIS](http://luis.ai).
* stateless which helps them scale.
* electron UI
 
## Built commandline 
Create a folder for your bot, cd into it, and run npm init.

    npm install

    npm init

Run commandline

    node app2.js

Run Electro application

	electron . 

    npm start

Run tests

	npm test

Get the BotBuilder and Restify modules using npm.

    npm install --save botbuilder
    npm install --save restify
    
Create a file named app.js and say hello in a few lines of code.
 
    var restify = require('restify');
    var builder = require('botbuilder');

    // Create bot and add dialogs
    var connector = new builder.ChatConnector({
        appId: "YourAppId",
        appPassword: "YourAppSecret"
    });
    var bot = new builder.UniversalBot(connector);  
    bot.dialog('/', function (session) {
        session.send('Hello World');
    });

    // Setup Restify Server
    var server = restify.createServer();
    server.post('/api/messages', connector.listen());
    server.listen(process.env.port || 3978, function () {
        console.log('%s listening to %s', server.name, server.url); 
    });
