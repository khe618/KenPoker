angular.
  module('pokerApp').
  	component('chatPost',{
  	  template: 	
  	  					'<li class="left clearfix">' +
                          	'<span class="chat-img pull-left">' +
                            	'<img src="http://placehold.it/50/55C1E7/fff&text=U" alt="User Avatar" class="img-circle" />' +
                        	'</span>' +
                            '<div class="chat-body clearfix">' +
                                '<div class="header">' +
                                    '<strong class="primary-font">{{$ctrl.uid}}</strong> <small class="pull-right text-muted">' +
                                        '<span class="glyphicon glyphicon-time"></span>12 mins ago</small>' +
                                '</div>' +
                                '<p>' +
                                    '{{$ctrl.msg}}'+
                                '</p>' +
                            '</div>' +
                        '</li>',
      controller: function chatPostController($element){
      	//this.msg = $element.attr("msg");

      },
      bindings: {
      	msg: '=',
      	uid: '='
      }
  	})