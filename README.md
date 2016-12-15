# fdevstart [![Build Status](https://travis-ci.org/jfseb/fdevstart.svg?branch=master)](https://travis-ci.org/jfseb/fdevstart)[![Coverage Status](https://coveralls.io/repos/github/jfseb/fdevstart/badge.svg)](https://coveralls.io/github/jfseb/fdevstart)

Sample app to identify links / apps and start them after textual, bot-like input


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

The src folder contains both typescript and js files.

All files are compiled to gen  (using tsc or babel)
Compilation is to ES2015, as the jscoverage parse cannot treat new language
feature correclty

gulp-instrument (one of the jscoverage gulp integration) is used to generate
coverage instrumented sources in gen_cov

Currently the test folder is not compiled, but contains directly es6 modules

gulp, gulp-watch




##Models

the formulated questions are in

resources/model/intents.json

