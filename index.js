const https = require("https"),
      bodyParser = require("body-parser"),
	  MongoClient = require("mongodb").MongoClient,
	  ObjectId = require('mongodb').ObjectId,
	  path = require("path"),
	  request = require("request"),
	  express = require('express');
	  
var app = express()
var http = require('http').Server(app);
var io = require('socket.io')(http);
var db;

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));

var port = process.env.PORT || 3000;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
    var obj = {"text":msg}
    db.collection("messages").insert(obj, function(err, result){
    	if (err) throw err;
    })
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});

/*MongoClient.connect("mongodb://heroku_vkbrcrpg:2e3eu4738uq1usfrplmquuben2@ds151707.mlab.com:51707/heroku_vkbrcrpg", function (err, client){
	db = client.db("heroku_vkbrcrpg")
})*/
MongoClient.connect("mongodb://admin:password1@ds151707.mlab.com:51707/heroku_vkbrcrpg", function (err, client){
	db = client.db("heroku_vkbrcrpg")
})