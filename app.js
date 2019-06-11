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
var suits = ['s', 'd', 'h', 'c']
var ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
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
	return ranks[n%13] + suits[Math.floor(n/13)]
}

function determineHand(hand){
	//high card: 0, pair: 1, 2 pair: 2, three of a kind: 3, straight: 4, flush: 5,
	//full house: 6, quads: 7, straight flush: 8
	var myRanks = hand.map(x =>ranks.indexOf(x.slice(0, x.length-1)));
	myRanks.sort(function(a, b){return b-a})
	var mySuits = hand.map(x => x[x.length-1])
	var isFlush = mySuits[0] === mySuits[1] &&
		  		  mySuits[1] === mySuits[2] &&
		  		  mySuits[2] === mySuits[3] &&
		  		  mySuits[3] === mySuits[4]
	var isStraight = (myRanks[0] === myRanks[1] + 1 &&
		myRanks[1] === myRanks[2] + 1 &&
		myRanks[2] === myRanks[3] + 1 &&
		myRanks[3] === myRanks[4] + 1) || 
		(myRanks[0] === 12 && 
		 myRanks[1] === 3 && 
		 myRanks[2] === 2 && 
		 myRanks[3] === 1 && 
		 myRanks[4] === 0)
	var counts = Array(13).fill(0)
	for (var rank of myRanks){
		counts[rank] += 1
	}
	var maxCount = Math.max(...counts)
	if (isFlush && isStraight){
		return [8, myRanks[0]]
	}

	if (maxCount === 4){
		return [7, counts.indexOf(4), counts.indexOf(1)]
	}
	if (maxCount === 3 && counts.includes(2)){
		return [6, counts.indexOf(3), counts.indexOf(2)]
	}
	if (isFlush){
		return [5, myRanks]
	}
	if (isStraight){
		return [4, myRanks[0]]
	}
	if (maxCount === 3){
		return [3, counts.indexOf(3), counts.lastIndexOf(1), counts.indexOf(1)]
	}
	if (maxCount === 2){
		var higherPair = counts.lastIndexOf(2)
		var lowerPair = counts.indexOf(2)
		if (higherPair !== lowerPair){
			return [2, higherPair, lowerPair, counts.indexOf(1)]
		}
		return [1, higherPair, myRanks]
	}
	return [0, myRanks]
}

function compareHands(ranking1, ranking2){
	if (ranking1[0] !== ranking2[0]){
		return ranking1[0] - ranking2[0]
	}
	var handType = ranking1[0]
	if (handType === 8 || handType === 4){
		return ranking1[1] - ranking2[1]
	}
	if (handType === 7 || handType === 6 ){
		if (ranking1[1] !== ranking2[1]){
			return ranking1[1] - ranking2[1]
		}
		return ranking1[2] - ranking2[2]
	}
	if (handType === 5 || handType === 0){
		for (var i = 0; i < 5; i++){
			if (ranking1[1][i] !== ranking2[1][i]){
				return ranking1[1][i] - ranking2[1][i]
			}
		}
		return 0;
	}
	if (handType === 3 || handType === 2){
		if (ranking1[1] !== ranking2[1]){
			return ranking1[1] - ranking2[1]
		}
		if (ranking1[2] !== ranking2[2]){
			return ranking1[2] - ranking2[2]
		}
		return ranking1[3]
	}
	if (handType === 1){
		if (ranking1[1] !== ranking2[1]){
			return ranking1[1] - ranking2[1]
		}
		for (var i = 0; i < 5; i++){
			if (ranking1[2][i] !== ranking2[2][i]){
				return ranking1[2][i] - ranking2[2][i]
			}
		}
		return 0
	}
}
function subset(arra, arra_size)
 {
    var result_set = [], 
        result;
    
   
for(var x = 0; x < Math.pow(2, arra.length); x++)
  {
    result = [];
    i = arra.length - 1; 
     do
      {
      if( (x & (1 << i)) !== 0)
          {
             result.push(arra[i]);
           }
        }  while(i--);

    if( result.length === arra_size)
       {
          result_set.push(result);
        }
    }

    return result_set; 
}

function myBestHand(cards){
	var possibleHands = subset(cards, 5)
	var bestHand = possibleHands[0]
	console.log(bestHand)
	var bestRanking = determineHand(bestHand)
	var nextRanking;
	for (var i = 1; i < 21; i++){
		nextRanking = determineHand(possibleHands[i])
		if (compareHands(nextRanking, bestRanking) > 0){
			bestRanking = nextRanking
			bestHand = possibleHands[i]
		}
	}
	return [bestHand, bestRanking]
}

function determineWinners(result, cards){
	var community = result.community
	var winners = [cards.players[0].uid]
	var bestRanking = myBestHand(community.concat(cards.players[0].cards))[1]
	var nextRanking;
	var comparison;
	for (var i = 1; i < cards.players.length; i++){
		nextRanking = myBestHand(community.concat(cards.players[i].cards))[1]
		comparison = compareHands(nextRanking, bestRanking)
		if (comparison > 0){
			bestRanking = nextRanking
			winners = [cards.players[i].uid]
		}
		else if (comparison === 0){
			winners.push(cards.players[i].uid)
		}
	}
	return winners;
}

//players is an array of userids
function dealCards(players){
	shuffleArray(deck)
	var i = 0;
	var result = [];
	var cards;
 	for (var player of players){
 		cards = [numToCard(deck[i]), numToCard(deck[i+1])];
		result.push({uid:player, cards:cards});
		i += 2
		if (connectedUsers[player]){
			connectedUsers[player].emit('cards', cards)
		}
		var community = [numToCard(deck[i]), numToCard(deck[i+1]), numToCard(deck[i+2]), numToCard(deck[i+3]), numToCard(deck[i+4])]
	}
	db.collection("cards").update({}, {players:result, community:community}, function(err, result){
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
		result.seats[button].stackSize -= 1;
		result.seats[lastBet].amountBet = 2;
		result.seats[lastBet].stackSize -= 2;
	}
	else{
		var smallBlind = findNextPlayer(result, result.button);
		var bigBlind = findNextPlayer(result, smallBlind)
		result.seats[smallBlind].amountBet = 1
		result.seats[smallBlind].stackSize -= 1;
		result.seats[bigBlind].amountBet = 2
		result.seats[bigBlind].stackSize -= 1;
		result.lastBet = bigBlind
	}
	var playerIds =[]
  	for (seatNum of seatNums){
  		playerIds.push(seats[seatNum].uid)
  	}
  	result.community = []
  	result.pot = 0;
  	dealCards(playerIds)
  	db.collection("gameState").update({}, result, function(err, result2){
  		if (err) throw err;
  		io.emit("game state", result)
  	})
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
	else{
		db.collection("cards").findOne({}, function(err, result2){
			if (err) throw err;
			if (street == 'river'){
				winners = determineWinners(result, result2)
				/*for (var winner of winners){
					result.seats[winner].stackSize += Math.floor(result.pot / winners.length)
				}*/
				for (var i = 1; i<= 4; i++){
					if (winners.includes(result.seats[i].uid)){
						result.seats[i].stackSize += Math.floor(result.pot / winners.length)
					}
				}
				newGame(result)
				return;
			}
			if (street == 'preflop'){
				result.street = 'flop'
				result.community[0] = result2.community[0]
				result.community[1] = result2.community[1]
				result.community[2] = result2.community[2]
			}
			else if (street == 'flop'){
				result.street = 'turn'
				result.community[3] = result2.community[3]
			}
			else if (street == 'turn'){
				result.street = 'river';
				result.community[4] = result2.community[4]
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
			db.collection("gameState").update({}, result, function(err, result2){
  				if (err) throw err;
  				io.emit("game state", result)
  			})
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
  				console.log(result.turn)
  				if (result.turn == result.lastBet && !(result.bet == 2 && result.street == 'preflop')){
  					//give BB option to check
  					nextStreet(result)
  				}
  				else{
  					db.collection("gameState").update({}, result, function(err, result2){
  						if (err) throw err;
  						io.emit("game state", result)
  					})
  				}
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
  			seats[seat] = {uid:uid, stackSize:200, folded:true, amountBet:0}
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
  				result.community = []
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