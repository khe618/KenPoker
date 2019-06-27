angular.
  module('pokerApp').
	component('chatBox', {
	  template: '<div class="container">' +
    			  '<div class="row">' +
        		    '<div class="col-md-5">' +
            		  '<div class="panel panel-primary">' +
                	    '<div class="panel-heading" id="accordion">' +
                    	  '<span class="glyphicon glyphicon-comment"></span> Chat' +
                    	  '<div class="btn-group pull-right">' +
                        	'<a type="button" class="btn btn-default btn-xs" data-toggle="collapse" data-parent="#accordion" href="#collapseOne">' +
                              '<span class="glyphicon glyphicon-chevron-down"></span>' +
                        	'</a>' +
                    	  '</div>' +
                		'</div>' +
            			'<div class="panel-collapse collapse" id="collapseOne">' +
            			  '<div class="panel-body">' +
            			  	'<ul class="chat">' +
            			      '<span ng-repeat="post in $ctrl.posts">' +
            			        '<chat-post msg="post.msg" uid="post.uid"></chat-post>' +
            			      '</span>' + 
            			    '</ul>' +
                          '</div>' +
                		  '<div class="panel-footer">' +
                       	    '<div class="input-group">' +
                      		  '<form class="form-inline" id="message_form">' +
                        		'<div class="form-group mx-sm-3 mb-2">' +
                          		  '<input class="form-control" id="message_input" autocomplete="off">' +
                        		'</div>' +
                        		'<button type="submit" class="btn btn-primary mb-2">Send</button>' +
                      		  '</form>' +
                   			'</div>' +
                		  '</div>' +
            			'</div>' +
            		  '</div>' +
        			'</div>' +
    			  '</div>' +
				'</div>',
	  controller: function chatBoxController($scope){
	  	var self = this;
	  	self.posts = []
	  	$scope.$on("chat message", function (event, args){
	  		self.posts.push(args)
	  		$scope.$apply();
	  	})
	  }
	})