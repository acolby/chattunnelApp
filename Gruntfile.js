'use strict';

module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
			pkg: grunt.file.readJSON('package.json'),
			sass: {
				public: {
					files: {
						'public/styles/main.css': 'public/styles/main.scss'
					}
				}
			},
			watch: {
				styles: {
					files: ['public/styles/**/*.scss'],
					tasks: ['sass'],
					options: {
						spawn: false,
					},
				},
			}
		});

		grunt.loadNpmTasks('grunt-contrib-sass');
		grunt.loadNpmTasks('grunt-contrib-watch');

		// Load the plugin that provides the "uglify" task.
		// grunt.loadNpmTasks('grunt-contrib-uglify');

	};