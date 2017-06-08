/**
 * A simple webserver serving the interface
 *
 */


var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var process = require('process');
 // conf = require('./config.json');
var uuid = require('node-uuid');
var debug = require('debug');
var debuglog = debug('server');
var botdialog = require('./gen/bot/smartdialog.js');


//var botdialog = require('./gen/bot/dialog.js');

var htmlconnector = require('./gen/ui/htmlconnector.js');
// Create bot and bind to console
var connector = new htmlconnector.HTMLConnector();

botdialog.makeBot(connector);

//botdialog.makeBot(connector);


app.use(express.static(__dirname + '/public'));


app.get('/', function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

server.listen(process.env.PORT || 42043);

io.sockets.on('connection', function (socket) {
  var id = uuid.v4().toString(); // '' + Date.now();
  socket.id = id; //uuid.v4();// id;
  console.log('Client connected' + Object.keys(io.clients).join(' ')+ ' this id ' + socket.id);
       // console.log('Got answer : ' + sAnswer + '\n');
// not now  htmlconnector.startConversation({ id : id } , function() {});

  connector.setAnswerHook(function (sAnswer, oCommand, sId) {
    debuglog('sending answer for ' + sId + ' to ' + id + ' > ' + sAnswer);
    socket.emit('wosap',{ time : new Date(),
      name : 'unknown' ,
      command : oCommand,
      text : sAnswer
    });
  }, id);

  //socket.emit('register', { id : id });
   // io.clients(0).send('chat' ,{ time  : new Date(), name : 'HUGO', text: 'something'});
  socket.on('disconnect', () => {
    console.log('Client disconnected');  });
	// der Client ist verbunden
  socket.emit('wosap', { time : new Date(), text: 'Indicate your query or wish:' });
  console.log('got a message from ' + id);
	// wenn ein Benutzer einen Text senden
  socket.on('wosap', function (data) {
		// so wird dieser Text an alle anderen Benutzer gesendet
    debuglog('another request from ' + id + ' ' + data.text);
    connector.processMessage(data.text, id);
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
