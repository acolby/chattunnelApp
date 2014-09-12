// copyright: aaron colby 2014
// tm: chattunnel
// email: aaron@chattunnel.com

'use strict';

angular.module('chattunnel')
	.controller('ChatroomCtrl', ['$routeParams', '$scope', '$location', 'RSAService', '$window',
		function($routeParams, $scope, $location, RSAService, $window) {

			if(window.isltIE10){
				$scope.isltIE10 = true;
				return;
			}

			// get chatroom id from route
			$scope.chatroomId = $routeParams.id;
			$scope.chatroomStrength = parseInt($routeParams.strength, 10);

			$scope.showCreateScreen = false;
			if($scope.chatroomId === undefined){
				$scope.showCreateScreen = true;
				$scope.chatroomId = generateRandomString(7);
			}else if($scope.chatroomId.length < 7){
				$scope.showCreateScreen = true;
				$scope.chatroomId = generateRandomString(7);
			}
			if($scope.chatroomStrength === undefined){
				$scope.showCreateScreen = true;
				$scope.chatroomStrength = 512;
			}else if(!($scope.chatroomStrength === 256 ||
					   $scope.chatroomStrength === 512 ||
					   $scope.chatroomStrength === 1024 ||
					   $scope.chatroomStrength === 2048)){
				$scope.showCreateScreen = true;
				$scope.chatroomStrength = 512;
			}

			// check speed to create 512 key
			$scope.testingSpeed = true;
			var then = new Date();
			RSAService.generate(512);
			var now = new Date();
			$scope.testTime = now.getTime() - then.getTime();
			$scope.testingSpeed = false;

			$scope.createRoom = function(strength){
				$location.path('/' + $scope.chatroomStrength + '/' + $scope.chatroomId);
				loadRoom()
			};

			if(!$scope.showCreateScreen){
				loadRoom();
			}

			function loadRoom(){

				$scope.chatroomId = $scope.chatroomId + '_' + $scope.chatroomStrength;

				// get the room reference and all other references from it
				var roomRef = new Firebase("https://cryptotunnnel.firebaseIO.com/rooms/" + $scope.chatroomId);
				var messagesRef = roomRef.child('messages');
				var peopleRef = roomRef.child('people');
				var secretRef = roomRef.child('secrets').child(generateRandomString(15));
				var rootRef = roomRef.root();
				var meRef = null;  // don't know until me is created

				var offsetRef = new Firebase("https://cryptotunnnel.firebaseIO.com/.info/serverTimeOffset");
				var serverTimeOffset = 0;
				offsetRef.on("value", function(snap) {
					serverTimeOffset = snap.val();
				});

				// updating my status
				$scope.setMyStatus = function(status){
					// update fields accordinly
					if(meRef){
						meRef.update({
							'status': status
						}, function(error){

						});
					}
				};

				$scope.connected = false;
				rootRef.root().child('.info/connected').on('value', function(connectedSnap) {
					if (connectedSnap.val() === true) {
						// connected!
						$scope.connected = true;
						$scope.setMyStatus(1);
						safeApply($scope);
						if(meRef){
							meRef.onDisconnect().update({
								'status': 10
							});
						}
					} else {
						// disconnected!
						$scope.connected = false;
						safeApply($scope);
					}
				});

				// functions that watch firebase and update the view accordingly
				var initilized = false;
				function initilize() {
					initilized = true;
					// handeling the people ref
					peopleRef.on('child_added', function(snapshot) {
						var value = snapshot.val();
						$scope.people.addPerson(value);
						safeApply($scope);
					});
					peopleRef.on('child_changed', function(snapshot) {
						var value = snapshot.val();
						$scope.people.updatePerson(value);
						safeApply($scope);
					});
					// handeling the messagesRef
					messagesRef.endAt().limit(120);
					messagesRef.on('child_added', function(snapshot) {
						var value = snapshot.val();
						$scope.messages.add_message(value);
						safeApply($scope);
					});
					// handeling disconnects
					meRef.onDisconnect().update({
						'status': 10
					});
				}

				// datastructures that manage the views
				// Managing me model
				$scope.me = {
					'rsa': null,
					'person': {}
				};

				// object used for managing to people model
				$scope.people = {
					'people': [],
					'peopleDisconnected': [],
					'peopleHere': [],
					'peopleLeft': [],
					'peopleTyping': [],
					'peopleITrust': [],
					'addPerson': function(person){
						if (person.publicKey === $scope.me.rsa.getPublicKey()) {
							person.me = true;
							person.trust = true; // auto truset self
							$scope.me.person = person;
						} else {
							person.me = false;
						}
						this.people.push(person);
						this.numberOfPeople++;
						this.calcutlateInstanceArrays();
					},
					'personFromPublicKey': function(publicKey) {
						var that = this;
						for (var i = 0; i < that.people.length; i++) {
							var value = that.people[i];
							if (value.publicKey === publicKey) {
								return value;
							}
						}
						return null;
					},
					'updatePerson': function(updatedPerson){
						var person = this.personFromPublicKey(updatedPerson.publicKey);
						person.status = updatedPerson.status;
						this.calcutlateInstanceArrays();
					},
					'setTrust': function(person, trust){
						person.trust = trust;
						this.calcutlateInstanceArrays();
					},
					'calcutlateInstanceArrays': function(){
						var that = this;
						that.peopleDisconnected = [];
						that.peopleHere = [];
						that.peopleLeft = [];
						that.peopleTyping = [];
						that.peopleITrust = [];
						for (var i = 0; i < that.people.length; i++) {
							switch(that.people[i].status){
								case 0:
									that.peopleLeft.push(that.people[i]);
									break;
								case 1:
									that.peopleHere.push(that.people[i]);
									break;
								case 8:
									that.peopleTyping.push(that.people[i]);
									that.peopleHere.push(that.people[i]);
									break;
								case 10:
									that.peopleDisconnected.push(that.people[i]);
									break;
								default:
									break;
							}
							if(that.people[i].trust === true){
								that.peopleITrust.push(that.people[i]);
							}
						}
					}
				};

				// Managing messages
				$scope.messages = {
					'messages': [],
					'add_message': function(newMessage){
						this.messages.push(newMessage);
						var decrypt = $scope.me.rsa.decrypt(newMessage.payload);
						if (decrypt) {
							var payload = JSON.parse(decrypt.plaintext);
							var message = {
								'type': (payload.type !== undefined)?payload.type:null,
								'contents': (payload.contents !== undefined)?payload.contents:null,
								'from': decrypt.publicKeyString,
								'to': (payload.to !== undefined)?payload.to:null,
								'fromServer': newMessage,
								'decryptedTo': decrypt,
								'decodedPayload': payload
							};
							var timeSent = new Date(newMessage.date - serverTimeOffset);
							$scope.chatareaDisplayObject.add_message(message, timeSent);
						}
					}
				};

				// managing the chatareDisplayObject
				$scope.chatareaDisplayObject = {
					items: [],
					lastMessageGroup: {
						'person': null,
						'messages': [],
						'sentTo': []
					},
					person_entered_room: function(person, date) {
						this.items.push({
							'person': person,
							'date': date,
							'type': 'person_entered_room'
						});
						this.lastMessageGroup = {
							'person': null,
							'messages': [],
							'sentTo': [],
							'to': null
						};
						playSound('sound_someoneEntered');
						this.checkIfMessagesHaveBeenRead();
						safeApply($scope);
					},
					person_left_room: function(person, date) {
						this.items.push({
							'person': person,
							'date': date,
							'type': 'person_left_room'
						});
						this.lastMessageGroup = {
							'person': null,
							'messages': [],
							'sentTo': [],
							'to': null
						};
						safeApply($scope);
					},
					you_entered_room: function(person, date) {
						this.items.push({
							'type': 'you_entered_room'
						});
						this.lastMessageGroup = {
							'person': null,
							'messages': [],
							'sentTo': [],
							'to': null
						};
						safeApply($scope);
					},
					glued: true,
					setGlued: function(glued){
						this.glued = glued;
						this.checkIfMessagesHaveBeenRead();
						safeApply($scope);
					},
					windowVisible: true,
					setWindowVisible: function(windowVisible){
						this.windowVisible = windowVisible;
						this.checkIfMessagesHaveBeenRead();
					},
					numberOfUnreadMessages: 0,
					checkIfMessagesHaveBeenRead: function(){
						if(this.windowVisible && this.glued){
							this.numberOfUnreadMessages = 0;
						}	
						if(this.numberOfUnreadMessages === 0){
							$('head title', $window.parent.document).text('chattunnel');
							Tinycon.setBubble('');
						}else{
							$('head title', $window.parent.document).text('(' + this.numberOfUnreadMessages + ') ' + 'chattunnel');
							Tinycon.setBubble(' ');
						}
					},
					add_message: function(message, timeSent) {
						var person = $scope.people.personFromPublicKey(message.from);
						var that = this;
						var peopleSentTo = [];
						for (var i = 0; i < message.to.length; i++) {
							peopleSentTo.push($scope.people.personFromPublicKey(message.to[i]));
						}
						if (person !== that.lastMessageGroup.person || JSON.stringify(message.to) !== JSON.stringify(that.lastMessageGroup.to)) {
							
							that.lastMessageGroup = {
								'person': person,
								'type': 'message_group',
								'messages': [{
									'contents': message.contents,
									'date': timeSent,
									'sentTo': peopleSentTo,
									'fromServer': message.fromServer,
									'decryptedTo': message.decryptedTo,
									'decodedPayload': message.decodedPayload
								}],
								'to': message.to,
								'sentTo': peopleSentTo
							};
							that.items.push(that.lastMessageGroup);
						} else {
							that.lastMessageGroup.messages.push({
								'contents': message.contents,
								'date': timeSent,
								'sentTo': peopleSentTo,
								'fromServer': message.fromServer,
								'decryptedTo': message.decryptedTo,
								'decodedPayload': message.decodedPayload
							});
						}
						if(person.publicKey !== $scope.me.rsa.getPublicKey()){
							that.numberOfUnreadMessages ++;
							playSound('sound_messageReceived');
						}else{
							playSound('sound_messageSent');
						}
						that.checkIfMessagesHaveBeenRead();
						safeApply($scope);
					},

				};
				$scope.$watch('chatareaDisplayObject.glued', function(){
					$scope.chatareaDisplayObject.setGlued($scope.chatareaDisplayObject.glued);
				});
				$scope.chatareaDisplayObject.you_entered_room();

				// handle loggin the user in to the chatroom
				$scope.newUserNameSubmitted = function($event) {
					
					if (!($scope.userName && $scope.connected === true)) {
						return;
					}
					// generate an RSA reference for the user
					$scope.generatingKeys = true;
					$scope.me.rsa = RSAService.generate($scope.chatroomStrength);
					$scope.generatingKeys = false;
					meRef = peopleRef.push({
						'name': $scope.userName,
						'status': 1,
						'publicKey': $scope.me.rsa.getPublicKey(),
						'date': Firebase.ServerValue.TIMESTAMP
					}, function(){
						$event.target.blur();
						$scope.hideLoginScreen = true;
						initilize();
					});
				};

				// functions that update firebase
				$scope.message = '';
				$scope.warnEnphasize = false;
				$scope.postMessage = function($event) {
					if($scope.message === ''){
						return;
					}
					if($scope.people.peopleHere.length < 2 || $scope.people.peopleITrust.length < 2){
						setTimeout(function(){
							$event.target.blur();
						}, 200);
						$scope.warnEnphasize = true;
						return;
					}
					var numberOfSentMessages = 0;
					var pubsToSendTo = [$scope.me.rsa.getPublicKey()];
					for (var i = 0; i < $scope.people.people.length; i++) {
						if ($scope.people.people[i].trust && !$scope.people.people[i].me) {
							pubsToSendTo.push($scope.people.people[i].publicKey);
						}
					}
					// send to self with ref to who it was too
					var message = $scope.me.rsa.encrypt({
						'type': 'text',
						'contents': $scope.message,
						'to': pubsToSendTo
					}, $scope.me.rsa.getPublicKey());
					messagesRef.push({
						'payload': message,
						'date': Firebase.ServerValue.TIMESTAMP
					});
					numberOfSentMessages++;

					// send to others
					for (i = 0; i < pubsToSendTo.length; i++) {
						if (!$scope.people.personFromPublicKey(pubsToSendTo[i]).me) {
							message = $scope.me.rsa.encrypt({
								'type': 'text',
								'contents': $scope.message,
								'to': [pubsToSendTo[i]]
							}, pubsToSendTo[i]);
							messagesRef.push({
								'payload': message,
								'date': Firebase.ServerValue.TIMESTAMP
							});
							numberOfSentMessages++;
						}
					}
					$scope.setMyStatus(1);
					$scope.message = '';
				};

				// is typing 
				var typingTimeout;
				$scope.messagekeypressed = function(){
					if($scope.me.person.status !== 8){
						$scope.setMyStatus(8);
					}
					if(typingTimeout){
						clearTimeout(typingTimeout);
					}
					typingTimeout = setTimeout(function(){
						$scope.setMyStatus(1);
					}, 2000);
				};

				// leave room
				$scope.leaveChatroom = function(){
					$scope.setMyStatus(0);
				};

				// managin the invite modal
				$scope.url = $location.absUrl();
				$scope.$watch('url', function() {
					$scope.url = $location.absUrl();
				});
				$scope.selectURLInput = function() {
					setTimeout(function() {
						$("#invitePeopleModalURL").select();
					}, 500);
				};

				//exploreMessageDetails modal
				$scope.exploreMessageDetailsMessage = {};
				$scope.setExploreMessageDetailsMessage = function(message){
					$scope.exploreMessageDetailsMessage = message;
				};

				var timeout;
				function warning() {
					if(!meRef){
						return;
					}
					meRef.onDisconnect().update({
						'status': 0
					});
					timeout = setTimeout(function() {
						meRef.onDisconnect().update({
							'status': 10
						});
					}, 1000);
					return "Please note - you will never be able to access the history of this conversation again!";
				}
				function noTimeout() {
					clearTimeout(timeout);
				}
				$window.onbeforeunload = warning;

				var connected = true;
				$scope.toggleconnect = function(){
					if(connected){
						Firebase.goOffline();
					}else{
						Firebase.goOnline();
					}
					connected = !connected;
				};

				// track if window is visible
				$($window).focus(function() {
				    $scope.chatareaDisplayObject.setWindowVisible(true);
				});
				$($window).blur(function() {
				    $scope.chatareaDisplayObject.setWindowVisible(false);
				});

				Tinycon.setOptions({
				    width: 7,
				    height: 9,
				    font: '10px arial',
				    colour: '#ffffff',
				    background: '#C93232',
				    fallback: true
				});

				// play sounds
				$scope.playsound = true;
				function playSound(sound){
					if($scope.playsound){
						document.getElementById(sound).play();
					}
					return;
				}
			}

			// helper functions
			function generateRandomString(length) {
				var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
				var text = '';
				for (var i = 0; i < length; i++) {
					text += possible.charAt(Math.floor(Math.random() * possible.length));
				}
				return text;
			}

			function safeApply(scope) {
				return (scope.$$phase || scope.$root.$$phase) ? (null) : scope.$apply();
			}

		}]);