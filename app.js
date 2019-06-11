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
		var flop = [numToCard(deck[i]), numToCard(deck[i+1]), numToCard(deck[i+2])]
		var turn = numToCard(deck[i+3])
		var river = numToCard(deck[i+4])
	}
	db.collection("cards").update({}, {players:result, flop:flop, turn:turn, river:river}, function(err, result){
		if (err) throw err;
	})

}

function getSeatNums(seats){
	var seatNums = []
	for (var i = 1; i <= 4; i++){
		if (seats[i] !== null){
			seatNums.push(i)
		}
	}
	return seatNums;
}

function getPlayersInHand(seats){
	var players = []
	for (var i = 1; i <= 4; i++){
		if (seats[i] !== null && !seats[i].folded){
			players.push(i)
		}
	}
	return players;
}

function findNextPlayer(result, i){
	var temp = i + 1;
	temp = temp % 4;
	var seats = result.seats
	while (temp != i && (seats[temp] == null || seats[temp].folded)){
		temp += 1;
		temp %= 4;
	}
	return temp;
}

function determineWinner(result){
	for (var i = 1; i <= 4; i++){
		if (result.seats[i] !== null && !result.seats[i].folded){
			return i
		}
	}
	return -1
}

function newGame(result){
	var seatNums = getSeatNums(result.seats)
	for (var seatNum of seatNums){
		result.seats[seatNum].amountBet = 0;
		result.seats[seatNum].folded = false;
	}
	result.bet = 0;
	result.button = findNextPlayer(result, result.button)
	if (seatNums.length == 2){
		result.lastBet = findNextPlayer(result, result.button) //big blind
		result.seats[button].amountBet = 1;
		result.seats[lastBet].amountBet = 2;
	}
	else{
		var smallBlind = findNextPlayer(result, result.button);
		var bigBlind = findNextPlayer(result, smallBlind)
		result.seats[smallBlind].amountBet = 1
		result.seats[bigBlind].amountBet = 2
		result.lastBet = bigBlind
	}
	var playerIds =[]
  	for (seatNum of seatNums){
  		playerIds.push(seats[seatNum].uid)
  	}
  	result.flop = null
  	result.turnCard = null
  	result.river = null
  	dealCards(playerIds)
}

function nextStreet(result){
	var street = result.street
	var playersInHand = getPlayersInHand(result.seats)
	if (playersInHand.length == 1){
		//everyone folded
		result.seats[playersInHand[0]].stackSize += result.pot
		newGame(result)
		return;
	}
	if (street == 'river'){
		winners = determineWinner(result)
		for (var winner of winners){
			result.seats[winner].stackSize += Math.floor(result.pot / winners.length)
			newGame(result)
		}
	}
	else{
		db.collection("cards").find({}, function(err, result2){
			console.log(result2)
			if (err) throw err;
			if (street == 'preflop'){
				result.street = 'flop'
				result.flop = result2.flop
			}
			else if (street == 'flop'){
				result.street = 'turn'
				result.turnCard = result2.turn
			}
			else if (street == 'turn'){
				result.street = 'river';
				result.river = result2.river
			}
			//var seatNums = getSeatNums(result.seats)
			for (var i = 1; i <= 4; i++){
				if(result.seats[i] !== null){
					result.seats[i].amountBet = 0
				}
			}
			result.bet = 0;
			result.lastBet = result.button;
			result.turn = findNextPlayer(result, result.button)
		})
		
	}
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
  socket.on('bet', function(bet){
  	db.collection("gameState").findOne({}, function(err, result){
  		if (err) throw err;
  		var seats = result.seats;
  		var turn = result.turn;
  		var currentBet = result.bet
  		if (seats[turn].stackSize >= bet && bet >= result.bet){
  			seats[turn].stackSize -= bet - seats[turn].amountBet
  			//raise
  			if (bet > result.bet){
  				result.bet = bet
  				result.lastBet = turn
  			}
  			result.pot += bet - seats[turn].amountBet;
  			seats[turn].amountBet = bet 
  			//find next turn
  			//special case of when BB checks preflop
  			if (result.bet == 2 && result.street == 'preflop'){
  				nextStreet(result)
  			}
  			else{
  				result.turn = findNextPlayer(result, result.turn)
  				if (result.turn == result.lastBet){
  					//give BB option to check
  					if (!(result.bet == 2 && result.street == 'preflop')){
  						nextStreet(result)
  					}
  				}
  			}
  			db.collection("gameState").update({}, result, function(err, result2){
  				if (err) throw err;
  				io.emit("game state", result)
  			})
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
  		if (seats[seat] != null){
  			isValid = false
  		}
  		var seatNums = getSeatNums(seats)
  		for (var seatNum of seatNums){
  			if (seats[seatNum].uid == uid){
  				isValid = false
  			}
  		}
  		
  		if (isValid){
  			seats[seat] = {uid:uid, stackSize:100, folded:true, amountBet:0}
  			seatNums.push(seat)
  			if (seatNums.length == 2){
  				//start game
  				for (var seatNum of seatNums){
  					seats[seatNum].folded = false
  				}
  				var playerIds =[]
  				for (seatNum of seatNums){
  					playerIds.push(seats[seatNum].uid)
  				}
  				dealCards(playerIds)
  				result.button = seatNums[0]
  				result.turn = seatNums[0];
  				seats[seatNums[0]].amountBet = 1
  				seats[seatNums[0]].stackSize -= 1
  				seats[seatNums[1]].amountBet = 2
  				seats[seatNums[1]].stackSize -= 2
  				result.bet = 2;
  				result.lastBet = seatNums[1]
  				result.pot = 3;
  				result.street = "preflop"
  				result.flop = null
  				result.turnCard = null
  				result.river = null
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