var app = angular.module('blogApp', ["firebase"]);
var uid;
app.controller("MyAuthCtrl", ["$scope", "$rootScope", "$http", "$firebaseAuth",
  function($scope, $rootScope, $http, $firebaseAuth) {
    $scope.authObj = $firebaseAuth();
  $scope.authObj.$onAuthStateChanged(function(firebaseUser) {
      if (firebaseUser) {
          console.log("Signed in as:", firebaseUser.uid);
          uid = firebaseUser.uid
      } else {
          console.log("Signed out");
      }
  });
  
  }
]);
app.config(function() {
  var config = {
    apiKey: "AIzaSyC9eny7iGTbbFJq0KKk7CTw7qKJSrX0hqY",
    authDomain: "kenpoker-461cd.firebaseapp.com",
    databaseURL: "https://kenpoker-461cd.firebaseio.com",
    storageBucket: "kenpoker-461cd.appspot.com"
  };
  firebase.initializeApp(config);
});