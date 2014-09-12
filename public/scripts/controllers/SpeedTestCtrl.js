// copyright: aaron colby 2014
// tm: chattunnel
// email: aaron@chattunnel.com

'use strict';

angular.module('chattunnel')
	.controller('SpeedTestCtrl', ['$scope', 'RSAService', '$timeout', '$cookieStore', '$window',
		function($scope, RSAService, $timeout, $cookieStore, $window) {

			//$cookieStore.put('_chattunnelSpeedTestCookee', 0);

			// get the ref from firebase
			var speedTestRef = new Firebase('https://chattunnelsplash.firebaseio.com/speedTest');

			// manage cooke to prefent running the test twice
			var speedTestCookeeValue = $cookieStore.get('_chattunnelSpeedTestCookee');
			if (speedTestCookeeValue === undefined || speedTestCookeeValue === 0) {
				speedTestCookeeValue = 0;
				$cookieStore.put('_chattunnelSpeedTestCookee', speedTestCookeeValue);
			}else{
				$scope.testCompleted = true;
				$scope.haveEmail = true;
				$scope.startTest = true;
				return;
			}

			$scope.numberOfTests = 20;
			$scope.percentComplete = 1;
			$scope.testStrength = 512;

			// test
			$scope.startTest = false;
			var data = [];
			var refToData;
			$scope.startTestNow = function(){
				$scope.startTest = true;
				if(runTestOnce() !== false){
					$timeout(function(){
						$scope.startTestNow();
					}, 100);
				}else{
					$scope.testCompleted = true;
					// push data to server
					var totalTime = 0;
					for(var i = 0; i < data.length; i ++){
						totalTime += data[i];
					}
					var averageSpeed = totalTime/data.length;

					refToData = speedTestRef.push({
						'averageSpeed': averageSpeed,
						'runs': data.length,
						'testStrength': $scope.testStrength,
						'userAgent': $window.navigator.userAgent
					});

				}
			};
			function runTestOnce(){
				if(data.length > $scope.numberOfTests){
					return false;
				}
				$scope.percentComplete = (data.length * 100)/$scope.numberOfTests;
				var then = new Date();
				RSAService.generate($scope.testStrength);
				var now = new Date();
				data.push(now.getTime() - then.getTime());
			}

			// after test
			$scope.haveEmail = false;
			$scope.enteredEmail = function(email){
				// average speed 
				$scope.haveEmail = true;
				refToData.update({
					'email': email
				});
				$cookieStore.put('_chattunnelSpeedTestCookee', 1);
			};

		}]);