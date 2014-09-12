'use strict';

angular.module('chattunnel', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'ui.bootstrap',
  'ui'
])
  .config(['$routeProvider', function ($routeProvider) {
      $routeProvider
        .when('/speedTest', {
          templateUrl: 'views/speedTest.html',
          controller: 'SpeedTestCtrl'
        })
        .when('/:strength/:id', {
          templateUrl: 'views/chatroom.html',
          controller: 'ChatroomCtrl'
        })
        .when('/:strength', {
          templateUrl: 'views/chatroom.html',
          controller: 'ChatroomCtrl'
        })
        .when('/', {
          templateUrl: 'views/chatroom.html',
          controller: 'ChatroomCtrl'
        })
        .otherwise({
          redirectTo: '/'
        });

    }]);
