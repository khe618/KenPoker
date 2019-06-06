

function signOut(){
  firebase.auth().signOut();
}


function initApp(){
  firebase.auth().onAuthStateChanged(function(user) {
    if(user){
      //document.getElementById("uid").value = user.uid
      //document.getElementById("navHome").className = "active"
    }
    else{
      window.location.href = "/login"
    }
  })
}

window.onload = function() {
  initApp();
};
$(function () {
  var socket = io();
  $('form').submit(function(){
    socket.emit('chat message', $('#m').val());
    $('#m').val('');
    return false;
  });
  /*socket.on('chat message', function(msg){
    $('#messages').append($('<li>').text(msg));
    window.scrollTo(0, document.body.scrollHeight);
  });*/
  socket.on('connect', function(socket){
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        var messages = JSON.parse(this.responseText)
        for (var message of messages){
          console.log(message.text)
        }
      }
    };
    xhttp.open("GET", "/messages", true);
    xhttp.send();
  })
  var output = document.getElementById('value')
  var slider = document.getElementById('m')
  output.innerHTML = slider.value;

  slider.oninput = function() {
    output.innerHTML = this.value;
  } 
  var stack = document.getElementById('stack')
  var stackSize = 1000;
  stack.innerHTML = stackSize
});