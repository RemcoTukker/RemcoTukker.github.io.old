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
      }
    },
    web: {
      options: {
        port: 8001
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jade');

  grunt.registerTask('default', ['jade', 'web', 'dotfile', 'watch']);
  grunt.registerTask('dot', ['web', 'dotfile']);
  grunt.registerTask('publish', ['jade', 'dot']);

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

  grunt.registerTask('dotfile', 'Build dotfile based on website' , function() {

    //make this function async:  
    var done = this.async(); //and call done() when done of course

    // first check on the disk which urls to enqueue initially
    var fs = require('fs'); // great that we can use core node modules here! :-)
    var skipdirs = {'static':'','node_modules':'','layouts':'', '.git':'', 'tools':''}; //these dirs dont contain content

    var queue = [];
    var files = fs.readdirSync('./'); // hrm where is this actually reading? I suppose dir where grunt is run.. or dir where gruntfile is?
    files.forEach(function(filename) {
        var filetype = fs.statSync(filename);
        if (filetype.isDirectory() && !(filename in skipdirs)) {
            queue.push('http://localhost:8001/' + filename + '/');
            console.log('http://localhost:8001/' + filename + '/ added to queue');
        }
    });

    // now send our crawler to check all these webpages and return us a graph describing them
    var minicrawler = require('./tools/minicrawler.js');
    minicrawler.processUrls(queue, 1, function(result) { // depth of one: dont crawl deeper

        //now transform the result (linksObject) to the DOT string
        var datastring = 'digraph website {\n';

        // first assign numbers to each page that has been crawled
        // I assume that none of the local pages urls are only a number
        // (otherwise the id number and the urls will get messed up)
        var id = 0;    
        for (var page in result) { //TODO: better IDs and labeling
            datastring += '  ' + id + ' [label="' + page + '", label2="more detailed information"];\n';  // TODO: read and add more detailed info if available
            result[id] = result[page];
            delete result[page];
            for (var page2 in result) {
                if (page in result[page2]) {
                    result[page2][id] = result[page2][page];
                    delete result[page2][page];
                }
            }

            id++;
        }

        // add the links themselves
        for (var page in result) {
            for (linksto in result[page]) {
                datastring += '  ' + page + ' -> ' + linksto + ';\n'; 
                //TODO?: add some property for weighting in case of higher link count
            }
        }
        datastring += '}';
            

        //TODO: everything on localhost:8001 is local to our website: replace it with relative links
        //regex for http://localhost:8001/ => ../
            //if (address.substring(0, 22) == "http://localhost:8001/") address = address.slice(21); //remove beginning for local sites
            //address = address + '/'; // TODO: fix properly!


        //result is the DOT description of the links between those websites; write it to a file
        fs.writeFileSync('./website.dot', datastring);
        console.log('Wroteg website.dot file');
        done(); // let grunt know we're finished
    }); 

  });

};
