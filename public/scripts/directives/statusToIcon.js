'use strict';

angular.module('chattunnel')
	.directive('statusToIcon', function() {
		return {
			'restrict': 'A',
			'scope': {
				'status': '='
			},
			'replace': true,
			'templateUrl': 'views/statusToIcon.html',
			'link': ['$scope', function($scope) {
				$scope.$watch('status', function(){
					$scope.status = $scope.status;
				});
			}]
		};
	});