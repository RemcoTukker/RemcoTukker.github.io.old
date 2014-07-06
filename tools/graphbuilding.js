exports.processUrls = function(seedUrls, depth, callback) {

    //TODO use depth parameter

    //TODO: tag all pages with relevant info: visited page or not, 404/other error responses, etc
    //TODO: rename if we got redirected to another page, eg /aboutwebsite => /aboutwebsite/ 

    // the queue of urls to be processed
    var queue = seedUrls;

    //this object is going to be the result of our efforts and will be given to the callback once done
    var linksObject = {}; 
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
    //


    //first, define a get function for getting pages
    var http = require('http');
    var get = function(url, cb) {
        console.log('requesting ' + url );
        http.get(url, function(res) {
            console.log(res.req.path);
            var data = "";
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on("end", function() {
                cb(res.statusCode, data, res.headers);
            });
        }).on("error", function() {
            console.log('error getting ' + url);
            cb(null, null);
        });
    };

    // then, the function that will be called for each URL and that will process the results
    var currentlyProcessing = 0;
    var cheerio = require('cheerio'); 

    var process = function(address) {
        currentlyProcessing++;
        get(address, function(statuscode, htmlpage, headers) {

          //  if (statuscode == 301) {  // permanent redirect, eg from /about => /about/
          //      var redirectTo = headers.location;
          //      //TODO: extend the linksObject to incorporate this info; 
          //      //for now, though, just always include the trailing slash
          //  }

            if (statuscode == 200) {  
                //TODO: more intelligent handling of other codes (?) maybe here just if(html) and add a color coding for the statuscodes (eg red for dead urls)
                linksObject[address] = {};
                var $ = cheerio.load(htmlpage);
                $('a').each(function(i, elem) {  //TODO: filter out mailto (and other stuff) and # hrefs
                    console.log(this.attribs.href);
                    //expand relative links to complete address (adapted from SO)
                    var completeLink = '';
                    if ( this.attribs.href.indexOf(':') != -1) {    // absolute link TODO: handle this properly instead of relying on : not being in latter part of url
                        completeLink = this.attribs.href;
                    } else {   // relative link (TODO: make sure that this also deals with the horrible relative links that start with / )
                        var stack = address.split('/');
                        var parts = this.attribs.href.split('/');
                        stack.pop(); //remove current file name (or empty string)
                        for (var i=0; i<parts.length; i++) {
                            if (parts[i] == ".") continue;
                            if (parts[i] == "..") stack.pop();
                            else stack.push(parts[i]);
                        }
                        completeLink = stack.join('/');
                    }

                    console.log(completeLink);

                    // later, we can queue up stuff here that we didn't yet visit.. 
                    // will need a list with visited places for that, preferably a db

                    if (address == completeLink) return; //no links to ourselves (but why did they show up in the first place? folder to index?)

                    // for now, just add a notch to the links of this page 
                    linksObject[address][completeLink] = linksObject[address][completeLink] ? linksObject[address][completeLink] + 1 : 1;

                    // also make a new entry for this page if it didnt exist yet (makes next step, counting, easier)
                    linksObject[completeLink] = linksObject[completeLink] ? linksObject[completeLink] : {};

                    //TODO: dealing with trailing / and nasty little things like that
                });
            }
            currentlyProcessing--;
            if (queue.length > 0) {
                process(queue.pop() );
            } else {
                if (currentlyProcessing == 0) callback(linksObject); // everything should be done
            }
        })

    };


    // finally, start the process! By starting only 5, we limit the concurrent requests (to 5) 
    for (var i = 0; i< 5; i++) {
        if (queue.length > 0) process(queue.pop() );    
    }


};  
