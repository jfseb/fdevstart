/**
 * A simple webserver serving the interface
 *
 */

/*global __dirname:true*/
var process = require('process');
if(process.env.ABOT_EMAIL_USER) {
  require('newrelic');
}
var http = require('http');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
//var errorHandler = require('errorhandler');
// socket.io raised unhandled errors
var pg = require('pg');
var cookieParser = require('cookie-parser');

var pgSession = require('connect-pg-simple')(session);

 // conf = require('./config.json');

var uuid = require('node-uuid');
var debug = require('debug');
var debuglog = debug('server');
var botdialog = require('./gen/bot/smartdialog.js');
var compression = require('compression');


var app = express();

app.locals.pretty = true;
app.set('port', process.env.PORT || 42042);
app.set('views', __dirname + '/app/server/views');
app.set('view engine', 'jade');
app.use(cookieParser());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(require('stylus').middleware({ src: __dirname + '/app/public' }));

//'https://jfseb-abot.herokuapp.com'

app.get('*',function(req,res,next){
  if((req.headers['x-forwarded-proto'] !='https') && process.env.PORT)
    res.redirect(process.env.ABOT_SERVER +req.url);
  else
    next(); /* Continue to other routes if we're not redirecting */
});

var oneDay = 86400000; // in milliseconds
app.use(express.static(__dirname + '/app/public',{
  maxage: oneDay
}));

if (process.env.NODE_ENV === 'development') {
  // only use in development
  //app.use(errorHandler());
}

// build mongo database connection url //

//var dbHost = process.env.DB_HOST || 'localhost';
//var dbPort = process.env.DB_PORT || 27017;
//var dbName = process.env.DB_NAME || 'node-login';


//var dbURL = 'mongodb://'+dbHost+':'+dbPort+'/'+dbName;
//if (app.get('env') == 'live'){
// prepend url with authentication credentials //
//	dbURL = 'mongodb://'+process.env.DB_USER+':'+process.env.DB_PASS+'@'+dbHost+':'+dbPort+'/'+dbName;
//}

// https://github.com/expressjs/session

var pglocalurl = process.env.DATABASE_URL || 'postgres://joe:abcdef@localhost:5432/startupdefaults';

var l_session = session({
  secret: 'faeb4453e5d14fe6f6d04637f78077c76c73d1b4',
  proxy: true,
  resave: true,
  saveUninitialized: true,

  // remember to create sessions table in DB!
  //https://www.npmjs.com/package/connect-pg-simple

  store : new pgSession({
    pg : pg,                                  // Use global pg-module
    conString : pglocalurl  //process.env.FOO_DATABASE_URL, // Connect using something else than default DATABASE_URL env variable
    //	tableName : 'user_sessions'               // Use another table-name than the default "session" one
  }),
});

//var sharedsession = require('express-socket.io-session');

app.use(l_session);



require('./app/server/routes')(app);

var server = http.createServer(app);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

//var server = require('http').createServer(app);
var io = require('socket.io').listen(server);


//io.use(ios(l_session));
var sharedsession = require('express-socket.io-session');

io.use(sharedsession(l_session, {
  autoSave:true
}));

//https://github.com/xpepermint/socket.io-express-session


app.use(express.static(__dirname + '/public'));


app.get('/', function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

server.listen(process.env.PORT || 42042);


// heroku requires the socket to be taken within 60 seconds,
// so we start the server early even if the bot initialization blocks
// it

setTimeout(function() {

  var htmlconnector = require('./gen/ui/htmlconnector.js');
// Create bot and bind to console
  var connector = new htmlconnector.HTMLConnector();

  botdialog.makeBot(connector);



  io.sockets.on('connection', function (socket) {
    var id = uuid.v4().toString(); // '' + Date.now();
    socket.id = id; //uuid.v4();// id;
  //console.log('here session on connect ' + socket.handshake.session);
  //console.log(socket.handshake.session);
  //console.log(JSON.stringify(socket.handshake.session));

    var user = socket.handshake.session &&
  socket.handshake.session.user &&
  socket.handshake.session.user &&
  socket.handshake.session.user.user;
    if (!user) {
      user = 'ano:' + uuid.v4();
    }
    debuglog('Client connected for user ' + user + ' ' + Object.keys(io.clients).join(' '));
       // console.log('Got answer : ' + sAnswer + '\n');
// not now  htmlconnector.startConversation({ id : id } , function() {});
    socket.on('login', function(userdata) {
      debuglog('Got a login event with ' + JSON.stringify(userdata));
      socket.handshake.session.userdata = userdata;
    });
    socket.on('logout', function(userdata) {
      debuglog('Got a logout event with ' + JSON.stringify(userdata));
      if (socket.handshake.session.userdata) {
        delete socket.handshake.session.userdata;
      }
    });
    socket.on('error', (err) => {
      console.log(err);
    });
    socket.on('reconnect_failed', (err) => {
      console.log(err);
    });
    console.log('associate answerhook '+ id);
    connector.setAnswerHook(function (sAnswer, oCommand, sId) {
      debuglog('sending answer for ' + sId + ' to ' + id + ' > ' + sAnswer);
      socket.emit('wosap',{ time : new Date(),
        name : 'unknown' ,
        command : oCommand,
        text : sAnswer,
        id : id
      });
    }, id);

  //socket.emit('register', { id : id });
   // io.clients(0).send('chat' ,{ time  : new Date(), name : 'HUGO', text: 'something'});
    socket.on('disconnect', () => {
      debuglog('Client disconnected' + id);  });
	// der Client ist verbunden
    socket.emit('wosap', { time : new Date(), text: 'Indicate your query or wish:' });
    debuglog('got a message from ' + user + ' ' + id  );
	// wenn ein Benutzer einen Text senden
    socket.on('wosap', function (data) {
		// so wird dieser Text an alle anderen Benutzer gesendet
    //console.log('Here data on request' + JSON.stringify(socket.handshake.session));
    //console.log(data);
    //var user = getUser(socket.handshake.session)
      debuglog('request has conversationid? '  + data.conversationid );
      var conversationid = data.conversationid || id;
      debuglog('re associate answerhook ' + conversationid);
      connector.setAnswerHook(function (sAnswer, oCommand, sId) {
        debuglog('sending answer for ' + sId + ' to ' + conversationid + ' > ' + sAnswer);
        socket.emit('wosap',{ time : new Date(),
          name : 'unknown' ,
          command : oCommand,
          text : sAnswer,
          id : conversationid
        });
      }, conversationid);
      debuglog('user' + user + ' conv: ' + conversationid + ' asks '  + data.text);
      connector.processMessage(data.text, { conversationid :conversationid,
        user : user});
// echo request:
//    socket.emit('chat', { time : new Date(), name: data.name || 'Anonym', text: data.text


   // + ' nr clients : ' +
   //   + Object.keys(io.sockets.connected).length
  //    });
    // io.sockets.emit('chat' , { data : 'someone else is talking' + id , name : id });

 //   io.sockets.connected[Object.keys(io.sockets.connected)[0]].emit('chat', {time  : new Date(), name : 'curosr',
 //     text : ' you are ' + Object.keys(io.sockets.connected)[0]});
    });
  });

}, 3000);