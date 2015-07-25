'use strict';

/**
 * Main module of the application.
 */
angular
	.module('groupsApp', [
		'ngAnimate',
		'ngCookies',
		'ngResource',
		'ngRoute',
		'ngSanitize',
		'ngTouch',
		'ui.timepicker'
	])
	.filter('encodeURIComponent', function() {
		return window.encodeURIComponent;
	})
	.config(function($routeProvider) {
		$routeProvider
			.when('/', {
				templateUrl: 'views/main.html',
				controller: 'MainCtrl'
			})
			.when('/start-a-group', {
				templateUrl: 'views/group.html',
				controller: 'GroupCtrl'
			})
			.otherwise({
				redirectTo: '/'
			});
	});
