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
var connectedUsers = {}
var deck = []
for (var i = 0; i < 52; i++){
	deck[i] = i
}
shuffleArray(deck)

/*app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});*/

function shuffleArray(array) {
	for (var i = array.length - 1; i > 0; i--) {
    	var j = Math.floor(Math.random() * (i + 1));
    	var temp = array[i];
    	array[i] = array[j];
    	array[j] = temp;
  	}
}

function numToCard(n){
	suits = ['s', 'd', 'h', 'c']
	ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
	return ranks[n%13] + suits[Math.floor(n/13)]
}

//players is an array of userids
function dealCards(players){
	shuffleArray(deck)
	var i = 0;
	var result = [];
	var cards;
 	for (var player of players){
 		cards = numToCard(deck[i]) + numToCard(deck[i+1]);
		result.push({uid:player, cards:cards});
		i += 2
		if (connectedUsers[player]){
			connectedUsers[player].emit('cards', cards)
		}
	}
	db.collection("cards").update({}, {players:result}, function(err, result){
		if (err) throw err;
	})

}

function getPlayers(seats){
	var playerIds = []
	for (var i = 1; i <= 4; i++){
		if (seats[i] != null){
			playerIds.push(i)
		}
	}
	return playerIds;
}

app.get("/login", function(req, res){
	res.sendFile("login.html", {root: __dirname + "/public/"})
})

app.get('/messages', function(req, res){
	db.collection("messages").find({}).toArray(function(err, result){
		if (err) throw err;
		else{
    		res.json(result);
    	}
	})
})

io.on('connection', function(socket){
  //console.log(socket)
  socket.on('login', function(uid){
  	connectedUsers[uid] = socket
  	db.collection("gameState").findOne({}, function(err, result){
  		if (err) throw err;
  		socket.emit('game state', result)
  	})
  	db.collection("cards").findOne({}, function(err, result){
  		for (var player of result.players){
  			if (player.uid == uid){
  				socket.emit('cards', player.cards)
  			}
  		}
  	})
  })

  socket.on('chat message', function(msg){
    //io.emit('chat message', msg);
    var obj = {"text":msg}
    db.collection("messages").insert(obj, function(err, result){
    	if (err) throw err;

    })
  });
  socket.on('take seat', function(data){
  	var seat = data.seat
  	var uid = data.uid
  	db.collection("gameState").findOne({}, function(err, result){
  		if (err) throw err;
  		var seats = result.seats
  		var isValid = true
  		/*for (var player of players){
  			if (player.uid == uid || player.seat == seat){
  				isValid = false
  			}
  		}*/
  		if (seats[seat] !== null){
  			isValid = false
  		}
  		
  		if (isValid){
  			seats[seat] = {uid:uid, stackSize:100, folded:true, amountBet:0}
  			var playerIds = getPlayers(seats)
  			for (var playerId of playerIds){
  				if (seats[playerId].uid == uid){
  					isValid = false
  				}
  			}
  			if (playerIds.length == 2){
  				//start game
  				for (var playerId of playerIds){
  					seats[playerId].folded = false
  				}
  				dealCards(playerIds)
  				result.button = playerIds[0]
  				result.turn = button;
  				seats[playerIds[0]].amountBet = 1
  				seats[playerIds[1]].amountBet = 2
  				result.bet = 2;
  				result.lastBet = playerIds[1]
  			}
  			db.collection('gameState').update({}, result, function(err, result2){
  				if (err) throw err;
  			})
  			io.emit('game state', result)
  		}
  	})
  })
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