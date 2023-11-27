module.exports = function(grunt) {

	grunt.initConfig({
		connect: {
			server: {
				options: {
					 port: 8080,
					 hostname: 'localhost',
					 livereload: 35780
				}
			}
		},
		watch: {
			all: {
				options: {
					livereload: 35780
				},
				files: [
					'*.html',
					'css/*.css',
					'js/*.js'
				]
			}
		}
	});

	grunt.loadNpmTasks( 'grunt-contrib-connect' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );

	grunt.registerTask( 'default', [ 'connect', 'watch:all' ] );

};
