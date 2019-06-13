

function signOut(){
  firebase.auth().signOut();
}


function initApp(socket){
  firebase.auth().onAuthStateChanged(function(user) {
    if(user){
      //document.getElementById("uid").value = user.uid
      //document.getElementById("navHome").className = "active"
      socket.emit('login', user.uid)
    }
    else{
      window.location.href = "/login"
    }
  })
}

/*window.onload = function() {
  initApp();
};*/



$(function () {
  /*function takeSeat(seatNum){
    socket.emit('take seat', {uid:uid, seat:seatNum})
  }*/

  var socket = io();
  initApp(socket)
  var stack = document.getElementById('stack')
  var stackSize = 200;
  var folded = true;
  var amountBet;
  var player;
  stack.innerHTML = stackSize;
  var output = document.getElementById('value')
  var slider = document.getElementById('m')
  output.innerHTML = slider.value;
  slider.max = stackSize;
  slider.oninput = function() {
    output.innerHTML = this.value;
  }
  document.getElementById('seat1').onclick = function(){
    socket.emit('take seat', {uid:uid, seat:1})
  }
  document.getElementById('seat2').onclick = function(){
    socket.emit('take seat', {uid:uid, seat:2})
  }
  document.getElementById('seat3').onclick = function(){
    socket.emit('take seat', {uid:uid, seat:3})
  }
  document.getElementById('seat4').onclick = function(){
    socket.emit('take seat', {uid:uid, seat:4})
  }
  document.getElementById('fold').onclick = function(){
    socket.emit('fold', {uid:uid})
  }
  $('#bet').submit(function(){
    var bet = parseInt($('#m').val())
    if (bet <= stackSize){
      socket.emit('bet', bet);
      /*$('#m').val(1);
      output.innerHTML = 1;
      stackSize -= bet
      stack.innerHTML = stackSize
      slider.max = stackSize*/
    }
    return false;
  });
  /*$('#seat').submit(function(){
    var radios = document.getElementsByName('seat');
    for (var radio of radios){
      if (radio.checked){

        socket.emit('take seat', {uid:uid, seat:radio.value});
      }
    }
    return false;
  })*/
  /*socket.on('chat message', function(msg){
    $('#messages').append($('<li>').text(msg));
    window.scrollTo(0, document.body.scrollHeight);
  });*/
  socket.on('cards', function(cards){
    var cardElem = document.getElementById('cards')
    cardElem.style.display = 'block'
    cardElem.innerHTML = 'Cards: ' + cards[0] + cards[1]
  })
  socket.on('game state', function(state){
    var found = false;
    var openSeats = []
    for (var i = 1; i <= 4; i++){
      var player = state.seats[i]
      if (player !== null){
        if(player.uid == uid){
          found = true
          stackSize = parseInt(player.stackSize)
          folded = player.folded
          amountBet = parseInt(player.amountBet)
          stack.innerHTML = stackSize
          slider.max = stackSize;
          slider.min = state.bet
          slider.value = state.bet
          output.innerHTML = state.bet
        }
        document.getElementById("seat" + i + "info").innerHTML = 
        "id: " + player.uid + " Stack: " + player.stackSize + " Amount Bet: " + player.amountBet + " Folded: " + player.folded
        
      }
      else{
        openSeats.push(i)
      }
      
    }
    document.getElementById("pot").innerHTML = state.pot
    document.getElementById("community").innerHTML = ""
    console.log(state.community)
    if (state.community){
      for (var j = 0; j < state.community.length; j++){
        document.getElementById("community").innerHTML += state.community[j] + " " 
      }
    }
    for (var i = 1; i <= 4; i++){
      document.getElementById("seat" + i).style.display = "none"
    }
    if (!found){
      for (var seat of openSeats){
        document.getElementById("seat" + seat).style.display = "block"
      }
    }
    if (state.button){
      document.getElementById("seat" + state.button + "info").innerHTML += " (button) "
    }
    document.getElementById("betSpan").style.display = "none"
    if (state.turn){
      document.getElementById("seat" + state.turn + "info").innerHTML += " (action) "
      if (state.seats[state.turn].uid == uid){
        document.getElementById("betSpan").style.display = "block"
      }
    }

  })
  socket.on('connect', function(s){
    /*var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        var messages = JSON.parse(this.responseText)
        for (var message of messages){
          console.log(message.text)
        }
      }
    };
    xhttp.open("GET", "/messages", true);
    xhttp.send();*/
  })
});