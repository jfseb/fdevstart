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


set ABOT_WRITE_REGRESS=1 to overwrite the regression database

run node perf/smartdialog.perf.js for performance regression

##Environment variables

ABOT_MODELPATH=..\sensitive\
DATABASE_URL= < a valid postgres connection string >
ABOT_LOGDB=1

For the password reset e-mails:
for https redirect (must be the https!)
ABOT_SERVER=https://wosap.herokuapp.com

ABOT_EMAIL_PASS
ABOT_EMAIL_USER
ABOT_EMAIL_SERVER

set via heroku

##Postgres setup

The bot logs conversations, users and sessions in a postgres database
if environment variable ABOT_LOGDB is set to a truthy variable

/src/sql/tabl_users.sql
/src/sql/tabl_sessions.sql
/src/sql/tabl_convlog.sql


SSL setup on windows, see

https://www.howtoforge.com/postgresql-ssl-certificates
http://esaucairn-almuric.blogspot.de/2009/07/windows-ssl-for-postgresql.html

##Models

the formulated questions are in

resources/model/intents.json

