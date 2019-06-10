

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
  var socket = io();
  initApp(socket)
  var stack = document.getElementById('stack')
  var stackSize = 1000;
  stack.innerHTML = stackSize;
  var output = document.getElementById('value')
  var slider = document.getElementById('m')
  output.innerHTML = slider.value;
  slider.max = stackSize;
  slider.oninput = function() {
    output.innerHTML = this.value;
  }
  $('#bet').submit(function(){
    var bet = $('#m').val()
    if (bet <= stackSize){
      socket.emit('chat message', $('#m').val());
      $('#m').val(1);
      output.innerHTML = 1;
      stackSize -= bet
      stack.innerHTML = stackSize
      slider.max = stackSize
    }
    return false;
  });
  $('#seat').submit(function(){
    var radios = document.getElementsByName('seat');
    for (var radio of radios){
      if (radio.checked){

        socket.emit('take seat', {uid:uid, seat:radio.value});
      }
    }
    return false;
  })
  /*socket.on('chat message', function(msg){
    $('#messages').append($('<li>').text(msg));
    window.scrollTo(0, document.body.scrollHeight);
  });*/
  socket.on('cards', function(cards){
    console.log(cards)
  })
  socket.on('game state', function(state){
    var found = false
    for (var i = 1; i <= 4; i++){
      if (state.seats[i] !== null){
        document.getElementById('seat'+i).disabled = true
        if(state.seats[i].uid == uid){
          found = true
          document.getElementById('seat').style.display = 'none'
        }
      }
      
    }
    if (!found){
      document.getElementById('seat').style.display = 'block'
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