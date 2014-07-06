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

  grunt.registerTask('default', ['jade', 'web', 'watch']);
  grunt.registerTask('publish', ['jade']);
  grunt.registerTask('dot', ['web', 'dotfile']);
  grunt.registerTask('all', ['publish','dot']);

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

    var fs = require('fs'); // great that we can use core node modules here! :-)
   
    // first check on the disk which urls to enqueue initially
    var skipdirs = {'static':'','node_modules':'','layouts':'', '.git':''}; //these dirs dont contain content

    var queue = [];
    var files = fs.readdirSync('./'); // hrm where is this actually reading? I suppose dir where grunt is run.. or dir where gruntfile is?
    files.forEach(function(filename) {
        var filetype = fs.statSync(filename);
        if (filetype.isDirectory() && !(filename in skipdirs)) {
            queue.push(filename);
            console.log(filename + ' added to queue');
        }
    });

    //define a get function for getting pages
    var http = require('http');
    var get = function(url, cb) {
        console.log('requesting ' + url );
        http.get(url, function(res) {
            var data = "";
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on("end", function() {
                cb(data);
            });
        }).on("error", function() {
            console.log('error getting ' + url);
            cb(null);
        });
    };

   
    // this object will contain a proper link count
    // should look like this: 
    // {
    // 'MAS': {'ALife':3, 'http://something/':3},
    // 'ALife': {'MAS':2, 'http://somethingelse/':3},
    // 'http://something/': {'MAS':1, 'http://somethingelse/':3}
    // }
    //
    // links to itself can be ignored
    // anything that doesnt have domain name is local to our site
    //
    // of course, if we are actually going to crawl the web, this should be in a DB instead of in memory
    var linksObject = {}; 

    // function that writes the dotfile
    var generateOutput = function() {
        var datastring = 'digraph website {\n';

        // first assign numbers to each page that has been crawled
        // I assume that none of the local pages are only a number
        // (otherwise the id number and the urls will get messed up)
        var id = 0;    
        for (var page in linksObject) {
            datastring += '  ' + id + ' [label="' + page + '", label2="more detailed information"];\n';  // TODO: read and add more detailed info if available
            linksObject[id] = linksObject[page];
            delete linksObject[page];
            for (var page2 in linksObject) {
                if (page in linksObject[page2]) {
                    linksObject[page2][id] = linksObject[page2][page];
                    delete linksObject[page2][page];
                }
            }
    
            id++;
        }

        // finally also assign numbers to pages that are referenced but dont have their own entry
        for (var page in linksObject) {
            for (linksto in linksObject[page]) {
                datastring += '  ' + page + ' -> ' + linksto + ';\n'; 
                //TODO?: add some property for weighting in case of higher link count
            }
        }
        datastring += '}';
    
        var result = fs.writeFileSync('./website.dot', datastring);
        console.log('Writing website.dot file: ' + result)
        done(); // let grunt know we're finished
    };


    //define a processing function to be called async for each address
    var currentlyProcessing = 0;
    var cheerio = require('cheerio'); 

    var process = function(address) {
        currentlyProcessing++;
        get(address, function(htmlpage) {
            if (htmlpage) {

                console.log(address);
                if (address.substring(0, 22) == "http://localhost:8001/") address = address.slice(21); //remove beginning for local sites
                address = address + '/'; // TODO: fix properly!

                console.log(linksObject);
                linksObject[address] = {};
                var $ = cheerio.load(htmlpage);
                var links = $('a').each(function(i, elem) {
                    console.log(this.attribs.href);
                    // later, we can queue up stuff here that we didn't yet visit.. 
                    // will need a list with visited places for that, preferably a db

                    if (address == this.attribs.href) return; //no links to ourselves (but why did they show up in the first place? folder to index?)

                    // for now, just add a notch to the links of this page 
                    linksObject[address][this.attribs.href] = linksObject[address][this.attribs.href] ? linksObject[address][this.attribs.href] + 1 : 1;

                    // also make a new entry for this page if it didnt exist yet (makes next step, counting, easier)
                    linksObject[this.attribs.href] = linksObject[this.attribs.href] ? linksObject[this.attribs.href] : {};

                    console.log(''+JSON.stringify(linksObject));
                    //TODO: dealing with trailing / and nasty little things like that
                });
            }
            currentlyProcessing--;
            if (queue.length > 0) {
                process('http://localhost:8001/' + queue.pop() );
            } else {
                if (currentlyProcessing == 0) generateOutput(); // everything should be done
            }
        })

    };


    //now, progress through the queue (here the async part starts)
    for (var i = 0; i< 5; i++) {
        if (queue.length > 0) process('http://localhost:8001/' + queue.pop() );    
    }

  });

};
