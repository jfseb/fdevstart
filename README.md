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



### Development
ABOT_WRITE_REGRESS

##some heroku commands 4

heroku config:get

##Postgres setup

The bot logs conversations, users and sessions in a postgres database
if environment variable ABOT_LOGDB is set to a truthy variable

/src/sql/tabl_users.sql
/src/sql/tabl_sessions.sql
/src/sql/tabl_convlog.sql


heroku pg:info
heroku pg:psql



SSL setup on windows, see

[https://www.howtoforge.com/postgresql-ssl-certificates]
http://esaucairn-almuric.blogspot.de/2009/07/windows-ssl-for-postgresql.html

##Postgres trigraph matching

see
[http://www.postgresonline.com/journal/archives/169-Fuzzy-string-matching-with-Trigram-and-Trigraphs.html](
http://www.postgresonline.com/journal/archives/169-Fuzzy-string-matching-with-Trigram-and-Trigraphs.html)


##Application keepalive

see
http://stackoverflow.com/questions/5480337/easy-way-to-prevent-heroku-idling

##Newrelic




##Models

the formulated questions are in a model called questions.
similar the formulated hints



There are
resources/model/intents.json
resources/model/operators.json


##strategies

Some information to jog memory on how stuff was/is implemented and
intended to work ;-)
[whatis](./strategy_whatis.md).



##Todo ideas


* fix: describe domain not implemented done
* fix FioriBOm domain descriptions
* fix primarytable move to each record
* fix add Business catalog to BackendCatalogs model

* list all countries with Government type communist state give same result
  as list all countries with Government type   :-(
        Indicate ignored passages!
  )
* domain categorization first
* regression tool
  build a tool to run a full regression on historical questions and answers,
   with the ability to mark changes and track the evolution of responses.
    -> pgsql database,  query by example,
     table with questions,
     table with current and history answers + categorization of response "changes"
  * Make the history correct to move back to "last entry".
  * on response,
   Returns a categorized word on and use that in a codecompletion
     ->awesomeplete
* automate upload of recorded data to AWS to keep below the 10000 lines free psql limit in heroku
* tidy up website, mostly done
* assure some load control on the bot to make machine downloads harder
* built a (local) webservice to query/response for regression testing
* add a statistics website (nr of records, nr of facts etc).
* add graphviz images for the models
* make a "what is x" or "Tell me about X" rule,
   with a response like
               X is a category in Domain A,

      X is a fact for category U in (x) Records of Domain a.

      X is a synonym for U, which is ...

      Other synonyms are ...
  mostly done.

* make this work with what is XXX

* sample model with multi domain fact
   *earth water air, fire
   *earth mars, jupiter, ...
   done

* add philosophical quote of the day
* add settings dialog and voting on some features / feedback (record what user actually activate)
* prevent access from other clients by using some session token in the communication

* manual commands to logout

* "read the riot act", get users agreement to cookies and privacy after some interaction

* add accept to create account page.

* describe X. Tell me about X,
   done
* todo: what is is X

* process a sentence identifying operator sequences,
        e.g.  domain <domain>          <category> <op> xx
         or category <cat> <op> <literal>

* ignore some words an go on, just list ignored words




* listme should separate by domain, e.g. list all element names
    now lists earth (!)


* add descriptions to the categories and domains.

* add linsk to the FioriSAP model
   done

* multivalued facts  make WebDynpro, factsheet categories modelled like this
* multidomain facts
* priorities in intent recognition


database extraction:


http://stackoverflow.com/questions/22887524/how-can-i-get-a-plain-text-postgres-database-dump-on-heroku


import a dump:
clean the database

E:\projects\nodejs\botbuilder\abot>psql -p 5433 --username=postgres --dbname=wosap_repl
delete from logconv;
delete from users;
delete from sessions;

E:\projects\nodejs\botbuilder\abot>psql -p 5433 --username=postgres --dbname=wosap_repl <heroku_db

dump from heroku:

heroku config,

then parse db string

pg_dump --host=exxxxxx.compute-1.amazonaws.com --port=5432  -f heroku_db --username=iyyyyyyyyyyyyyyy --passsword=xxx
 --dbname=yyyyyyyy










 todo: descripe Proxima C


 list all fiori intent, AppId, AppName for MAnage Material Coverage
Oops. Something went wrong and we need to start over.

list all fiori intent for MAnage Material Coverage
the fiori intent for MAnage Material Coverage are ...
#BusinessPartner-manageCreditRules;
#ChangeMaster-manage;
#HTMLGUI_FIN-manageCreditCase;
#InventoryReport-executematerialStocksPerperiodGR;
#MRPMaterial-manage;
#RELandUse-manageParcelUpdate;
#REMasterData-manageRentalObject;
#SalesOrder-manage;
#SalesOrder-manageList


list all fiori intent, AppId, AppName for "MAnage Material Coverage"
the fiori intent, AppId, AppName for "MAnage Material Coverage" are ...
"#MRPMaterial-manage", "F0251" and "Manage Material Coverage"

????


what is the fiori intent for MAnage Material Coverage
The fiori intent of MAnage Material Coverage is #APSOrder-manage
list all fiori intent for MAnage Material Coverage
the fiori intent for MAnage Material Coverage are ...
#BusinessPartner-manageCreditRules;
#ChangeMaster-manage;
#HTMLGUI_FIN-manageCreditCase;

Metaqueries on categories:
list all category containing Catalogs...


list all BackendCatalogs, TransactionCode for TransactionCode SM30
 -> generic list ignoring SM30
list all BackendCatalogs, TransactionCode for TransactionCode PK13N


describe "My Dispute Cases"
""My Dispute Cases"" has a meaning in 2 domains: "Fiori Backend Catalogs" and "FioriBOM"
in domain "Fiori Backend Catalogs" ""My Dispute Cases"" (interpreted as "DisputeCase") is a value for category "SemanticObject" present in 2(0.0%) of records;
in domain "FioriBOM" ""My Dispu

list all AppIds, AppName , fiori intent for SemanticObject "DisputeCase"

the AppIds, AppName , fiori intent for SemanticObject "DisputeCase" are ...
"F0702", "Manage Dispute Cases" and "#DisputeCase-manageDispute";
"UDM_AUTOWRITEOFF", "Write-Off Dispute Cases" and "#DisputeCase-wr



list all Government type, country with "Government type" "Communist state"  -> should return e.g. laos !?
does not because government type is not indexed.

List all AppNames, ApplicationComponents, Fiori Intents for Manage Sales orders Printing form
->  Maange cost center groups !?

List all AppNames, ApplicationComponents, Fiori Intents for "Manage Sales orders"
the AppNames, ApplicationComponents, Fiori Intents for "Manage Sales orders" are ...
"Manage Sales Orders", "SD-SLS" and "#SalesOrder-manage";
"Manage Sales Orders", "SD-SLS" and "#SalesOrder-manageList"


