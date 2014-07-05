module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
      options: {
        livereload: true
      },
      jade: {
        tasks: ["jade"],
        files: ["**/*.jade", "**/*.md", "!layouts/*.jade"]
      }
    },
    jade: {
      debug: {
        options: {
          data: {
            debug:true
          },
          pretty:true
        },
        files: [
          {
            expand: true,     // Enable dynamic expansion.
            //cwd: 'lib/',      // Src matches are relative to this path.
            src: ['**/*.jade', '!layouts/*.jade'], // Actual pattern(s) to match.
            //flatten: true,            
            //dest: 'build/',   // Destination path prefix.
            ext: '.html',   // Dest filepaths will have this extension.
            extDot: 'first'   // Extensions in filenames begin after the first dot
          },
        ]


//          "*": ["**/*.jade", "!layouts/*.jade"]
 //       }
      }
    },
  /*  jade: {
      options: {
        pretty: true,
        files: {
          "*": ["** /*.jade", "!layouts/*.jade"]
        }
      },
      debug: {
        options: {
          locals: {
            livereload: true
          }
        }
      },
      publish: {
        options: {
          locals: {
            livereload: false
          }
        }
      }
    }, */
    web: {
      options: {
        port: 8001
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jade');

  grunt.registerTask('default', ['jade', 'web', 'watch']);
  grunt.registerTask('publish', ['jade']);

  grunt.registerTask('web', 'Start web server...', function() {
    var options = this.options();
    var connect = require('connect');
    var serveStatic = require('serve-static');
    var app = connect();    
    app.use(serveStatic(__dirname));
    app.listen(options.port);
    //connect.createServer(
    //    connect.static(__dirname)
    //).listen(options.port);
    console.log('http://localhost:%s', options.port);

    //grunt.task.run(["watch:jade"]);
  });

};
