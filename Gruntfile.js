module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
      options: {
        livereload: true
      },
      jade: {
        tasks: ["jade"],
        files: ["**/*.jade", "**/*.md"]
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

  grunt.registerTask('default', ['jade', 'web', 'graphfile', 'jade', 'watch']);
  grunt.registerTask('crawl', ['web', 'graphfile']);
  grunt.registerTask('publish', ['jade', 'crawl', 'jade']);
  grunt.registerTask('server', ['web', 'watch']);

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

  grunt.registerTask('graphfile', 'Build file with links between pages on website' , function() {

    //make this function async:  
    var done = this.async(); //and call done() when done of course

    // first check on the disk which urls to enqueue initially
    var fs = require('fs'); // great that we can use core node modules here! :-)
    var skipdirs = {'static':'','node_modules':'','layouts':'', '.git':'', 'tools':'', 'newpage':''}; //these dirs dont contain content

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

        // clean up results.. for now, only keep local non-404 results TODO: add more stuff to graph
        for (var page in result) {
            // replace any localhost entries with relative links
            if (page.indexOf('http://localhost:8001/', 0) == 0) {
                // if we found our own root domain or a 404, completely remove it from the records (its not interesting..)
                if (page == 'http://localhost:8001/' || result[page].statuscode == 404) {
                    delete result[page];
                    continue;
                }

                // strip the first part of the title because its just Remco Tukker --
                result[page].title = result[page].title.slice(14);

                // change main entry
                var newEntry = page.slice(21);
                result[newEntry] = result[page];
                delete result[page];
               
            } else {
                delete result[page];
            }            
        }

        //second pass for further cleaning
        for (var page in result) {
            // if the entry doesnt have a title, take the last part of the url as a title
            if (result[page].title === "") {
                result[page].title = page.slice(page.lastIndexOf("/", page.length - 1) + 1);
            }
            if (result[page].description === "") {
                result[page].description = "[No description given]";
            }

        }

        // set some initial positions based on a spiral
        var r = 30;
        var theta = 0;
        var nodes = {};
        for (var page in result) {
          nodes[page] = {}; 
          nodes[page].x = r * Math.cos(theta);
          nodes[page].y = r * Math.sin(theta);
          //result[page].x = r * Math.cos(theta);          
          //result[page].y = r * Math.sin(theta);
          theta += 1.2;
          r += 5;
        }

        console.log(nodes);

        // use physics code to find stable initial position in graph for each node TODO: nodes[id].edges to be added
        var Worker = require('webworker-threads').Worker;
        var physicsWorker = new Worker('static/js/physics.js');
        physicsWorker.addEventListener("message", function (evt) {
          if (typeof evt.data == 'string' && evt.data == 'autopausing') {
            // physics converged, write the svg file
            console.log('almost done!');
            console.log(nodes);
            // write the graph.svg file

            function nodeSVGString(id, x, y, link, text) {
              var nodeString = "";
              nodeString += '    <g id="' + id + '" class="graphnode" transform="translate(' + x + ',' + y + ')" >\n';
              var rx = Math.max(6*text.length, 50); // TODO maybe improve this
              var ry = 45;
              nodeString += '     <ellipse cx="0" cy="0" rx="' + rx + '" ry="' + ry + '" fill="url(#gradient1)" />\n';
              nodeString += '     <a xlink:href="' + link + '"> <text x="0" y="5" text-anchor="middle">' + text + '</text> </a>\n';
              nodeString += '    </g>\n';
              return nodeString;
            }

                    
            var svgstring = '<svg version="1.1" baseProfile="full" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid" id="svggraph" style="overflow: hidden;">\n'

            // add the defs of the gradients and so on
            svgstring += fs.readFileSync("svgbuilding/defs.xml", "utf8");

            // start of node section
            svgstring += '  <g mask="url(#Mask)" > \n   <g id="svgpanzoom" transform="matrix(1,0,0,1,200,300)" >\n';

            // add nodes
            for (var page in result) {
                svgstring += nodeSVGString(page, nodes[page].x, nodes[page].y, page, result[page].title);
            }

            svgstring += '   </g>\n  </g>\n';
            // end of node section

            // add scripts
            svgstring += '  <script type="text/javascript"><![CDATA[\n';
            svgstring += fs.readFileSync("svgbuilding/svgscripts.js", "utf8");
            svgstring += '  ]]></script>\n';

            svgstring += "</svg>";

            fs.writeFileSync('static/img/graph2.svg', svgstring);
            done(); // let grunt know we're finished


          } else {
            // update positions
            for (var i in evt.data) {
              nodes[i].x += evt.data[i].dx;
              nodes[i].y += evt.data[i].dy;
            }
            physicsWorker.postMessage("start"); // next step
          }
        
        });
        physicsWorker.postMessage(nodes); 
        physicsWorker.postMessage({targetfps:0}); // in order not to run into settimeout code, on which webworker-threads hangs
        physicsWorker.postMessage("start"); // start the worker.




/* old code for writing a separate 
        // first clean up a bit: remove links to self, remove localhost references, and prune the network a bit
        for (var page in result) {
            for (var linkto in result[page].links) {
                // forget about links to self
                // and forget about links to our own root (its not interesting to have / in the graph..)
                if (linkto == page || linkto == 'http://localhost:8001/') delete result[page].links[linkto];
            }
            // replace any localhost entries with relative links
            if (page.indexOf('http://localhost:8001/', 0) == 0) {
                // if we found our own root domain, completely remove it from the records (its not interesting..)
                if (page == 'http://localhost:8001/') {
                    delete result[page];
                    continue;
                }

                // check if we have any links to another page of our own website
                if (result[page].statuscode != 404) for (var linkto in result[page].links) {
                    if (linkto.indexOf('http://localhost:8001/', 0) == 0) {
                        var newlink = linkto.slice(21);
                        result[page].links[newlink] = result[page].links[linkto];
                        delete result[page].links[linkto];
                    }
                }
                // change main entry
                var newEntry = page.slice(21);
                result[newEntry] = result[page];
                delete result[page];
               
            } else {
                // and forget about the links that were found at websites that dont start 
                // with localhost:8001 (otherwise we get a network thats too large)
                if (result[page].statuscode != 301) result[page].links = {};
                // maybe, we can loop over the links and actually not ignore links back to our page,
                // so that we can see which sites are linking back to us, or to pages that we already have an entry for,
                // so that we can identify nice clusters
            }

        }        

        //second pass for further cleaning
        for (var page in result) {
            // if the entry doesnt have a title, take the last part of the url as a title
            if (result[page].title === "") {
                result[page].title = page.slice(page.lastIndexOf("/", page.length - 1) + 1);
            }
            if (result[page].description === "") {
                result[page].description = "[No description given]";
            }

        }

        // then, convert the data in the format that visjs uses: in particular, replace urls with ID numbers
        var id = 0;
        var visjsdata = {nodes:[], edges:[]};

        for (var page in result) {
            // first push a node to the visjsdata
            var lbl = result[page].title;
            if (lbl.length > 25) lbl = lbl.substring(0, 22) + '...'
            visjsdata.nodes.push({id:id, label: lbl, title: result[page].description, url: page, statuscode: result[page].statuscode});

            // first check if this page is referenced somewhere else and if found, replace it with new number id
            for (var page2 in result) {
                if (page in result[page2].links) {
                    result[page2].links[id] = result[page2].links[page];
                    delete result[page2].links[page];
                }
            }
            // then update the name of the entry itself: remove the old name (url) and replace it with the id number 
            // (just copy entry to new id and remove old)
            // (makes it easier to push the edges)
            result[id] = result[page];
            delete result[page];

            id++;
        }

        for (var page in result) {
            for (linksto in result[page].links) {
                visjsdata.edges.push({from:page, to: linksto, style:'arrow-center'});
                //TODO?: add some property for weighting in case of higher link count
            }

        }


        console.log(JSON.stringify(visjsdata));

        // this is what our file should look like now:
        //var data = {nodes:[{id: '1', label: 'Node 1 (max 25 chars)', title: 'description', color:'?'}, {id: '2', label: 'Node 1'}], 
        //            edges:[{from: '1', to: '2'}, {from: '2', to: '3'}]}

        
        fs.writeFileSync('./graph.json', JSON.stringify(visjsdata, null, 2));
        done(); // let grunt know we're finished
*/

// old code; we're not using a DOT file anymore but the format visjs uses natively
/*
        // now, make a nice DOT string out of it
        var datastring = 'digraph website {\n';

        // first assign numbers to each page that has been crawled
        // I assume that none of the local pages urls are only a number
        // (otherwise the id number and the urls will get messed up)
        var id = 0;    
        for (var page in result) { 
            // add a node with all the details (title, description); title should go into label
            datastring += '  ' + id + ' [label="' + result[page].title + '", url="' + page + '", description="' 
                        + result[page].description + '", statuscode="' + result[page].statuscode + '"];\n';  

            // now we're going to replace the old names (urls), with new names (number ids)
            // this is necessary as DOT doesnt allow a whole lot of symbols in the node ids
            // first check if this page is referenced somewhere else and if found, replace it with new number id
            for (var page2 in result) {
                if (page in result[page2].links) {
                    result[page2].links[id] = result[page2].links[page];
                    delete result[page2].links[page];
                }
            }

            // then update the name of the entry itself: remove the old name (url) and replace it with the id number 
            // (just copy entry to new id and remove old)
            result[id] = result[page];
            delete result[page];

            id++;
        }

        // add the links themselves
        for (var page in result) {
            for (linksto in result[page].links) {
                datastring += '  ' + page + ' -> ' + linksto + ';\n'; 
                //TODO?: add some property for weighting in case of higher link count
            }
        }
        datastring += '}';
            
        //result is the DOT description of the links between those websites; write it to a file
        fs.writeFileSync('./website.dot', datastring);
        console.log('Wrote website.dot file');
*/
    }); 

  });

};
