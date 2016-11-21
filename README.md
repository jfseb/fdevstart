# fdevstart

Sample app to identify links / apps and start them after textual, bot-like input

[![Build Status](https://travis-ci.org/jfseb/fdevstart.svg?branch=master)](https://travis-ci.org/jfseb/fdevstart)

High Level Features:

* Simple Dialog system to integrate UI startup
* Built-in prompts for simple things like Yes/No, strings, numbers, enumerations.
* Built-in dialogs that utilize powerful AI frameworks like [LUIS](http://luis.ai).
* stateless which helps them scale.
* electron UI

* Note: the luis model and service url (including subscription project) are not part of the build

## Built commandline

    npm install

    npm init

Run Electrom application

    npm start

    or

	electron .


Run commandline bot

    node console_app.js

Run tests

	npm test



The code requires a luis model and subscription key which is not part of git


##Development

We are moving towards typescript for some of the logic

gulp, gulp-watch


