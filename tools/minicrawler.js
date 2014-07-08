exports.processUrls = function(seedUrls, depth, callback) {

    // This function crawls websites searching for links and storing some metadata in memory (title, description, http status code)
    // No url is visited twice and the results are supplied in one big object (see below what it looks like) to the callback function

    // TODO: (to make this a completely functional crawler)
    // * Improve linkchecker function
    // * Add optional postprocessing to remove 301 redirects (by replacing the original url with the url that the redirect points to)
    // * Add some safety checks for length of description and so on.. dont want to have a 1 Mbyte string there..
    // * Refactor next() / process() structure? its kind of ugly now?
    // * Use a DB for storing results instead of doing everything in memory
    // * See if we should deal more carefully with statuscodes (1xx and 5xx range and perhaps specific codes in 2xx, 3xx or 4xx range)
    // * Have an option to bunch all pages in a domain together
    // * Read robot.txt files
    // * Use sitemaps to quickly get an overview of a domain
    // * Have some scheduling for next check of a page? for continuous running instead of instantaneous run
    // * Implement some way to detect loops and constantly changing dynamic sites, ie, to detect swamps

    // the queue of urls to be processed 
    var queue = [];    
    
    // this object is going to be the result of our efforts and will be given to the callback once done
    var linksObject = {}; 
    // this is how it should look:
    // {
    //   'url1': {statuscode:200, title:'page title', description:'ideally 150-160 chars', links:{'url3':5, 'url6':1}},
    //   'url2': {statuscode:301, title:'301 Redirect', links:{'url1':1}},
    //   'url3': {statuscode:404, title:'404 Not Found'}
    // }
    //

    // first, define a get function for getting pages
    var http = require('http');
    var https = require('https');
    var get = function(url, cb) {
        var requestor;
        // apparently, you get a big fat fatal error when using something else than http(s), so we're careful here
        if (url.lastIndexOf('https://', 0) === 0) {
            requestor = https;
        } else if (url.lastIndexOf('http://', 0) === 0) {
            requestor = http;
        } else {
            console.log('Error: protocol of ' + url + ' not supported, fix the link checking function!!');
            cb(null, null, null);
            return;
        }
        requestor.get(url, function(res) { // do the actual http get request
            var data = "";
            res.on('data', function (chunk) { data += chunk; });
            res.on("end", function() { cb(res.statusCode, data, res.headers); });
        }).on("error", function() {
            console.log('error getting ' + url);
            cb(null, null, null);
        });
    };

    // secondly, a function for processing the next item in the queue
    var currentlyProcessing = 0;
    var next = function() {
        currentlyProcessing--;
        if (queue.length > 0) {
            process(queue.pop());
        } else {
            if (currentlyProcessing == 0) callback(linksObject); // everything should be done
        }
    }

    // a utility function for determining what a link is exactly doing
    // it either returns an absolute link (http, https), or an empty string (eg if it was an email: or a # href)
    var linkChecker = function(currentUrl, link) {

        // TODO: filter out mailto (and other stuff) and # hrefs
        // TODO: detect absolute links properly instead of relying on : not being in latter part of url

        if ( link.indexOf(':') != -1) return link; // absolute link
        
        // assuming we have a relative link now, turn it into an absolute link
        if (link.charAt(0) == '/') { 
            //first / after the 8th char (third slash in total) should be the end of the hostname for both http and https,
            // because hostname should at least be one char long..
            var thirdslash = currentUrl.indexOf('/', 8);
            var hostname = (thirdslash != -1) ? currentUrl.substring(0, thirdslash) : currentUrl;
            return hostname + link;
        } else {   
            var stack = currentUrl.split('/');
            var parts = link.split('/');
            stack.pop(); //remove current file name (or empty string)
            for (var i = 0; i < parts.length; i++) {
                if (parts[i] == ".") continue;
                if (parts[i] == "..") stack.pop();
                else stack.push(parts[i]);
            }
            return stack.join('/');
        }
    }

    // then, the function that will be called for each URL and that will process the results
    var cheerio = require('cheerio'); 
    var process = function(target) {  
        //expects a {url:'url', depth:int} object

        currentlyProcessing++;
        // this function should always exit through next() which will decrease the counter again

        // early exit if we already visited this page
        if (typeof linksObject[target.url] !== 'undefined') { 
            next();
            return;
        }

        get(target.url, function(statuscode, htmlpage, headers) {

            var sc = (statuscode - (statuscode % 100)) / 100; //null => 0 => default

            switch (sc) {
                case 2: // success. eg 200 OK
                    linksObject[target.url] = {statuscode:statuscode, description: '', title: '', links:{}};
                    var $ = cheerio.load(htmlpage);
                    $('title', 'head').each(function(i, elem) { // extract the title of the page; kinda ugly, but works...
                        if (typeof elem.children[0] !== 'undefined') linksObject[target.url].title = elem.children[0].data; 
                    }); 
                    $('meta', 'head').each(function(i, elem) { // extract the description of the page
                        if (typeof elem.attribs.name !== 'undefined' && elem.attribs.name.toLowerCase() == 'description') {
                            linksObject[target.url].description = elem.attribs.content; 
                        }
                    });
                    $('a').each(function(i, elem) { // extract all the links out of the page (TODO: maybe also extract img links)
                        var absLink = linkChecker(target.url, elem.attribs.href); // sanitize the link
                        if (absLink == '') return;
                        if (!linksObject[target.url].links[absLink]) linksObject[target.url].links[absLink] = 0; // works cause value is always 1 or larger
                        linksObject[target.url].links[absLink]++; // link from target.url page to absLink page, so increase the counter
                        if (target.depth < depth) {
                            queue.push({url:absLink, depth:target.depth + 1}); // enqueue the absLink url if we didnt reach depth threshold yet
                        }
                    });
                    // here you could add more processing code dealing with the content of a website
                    // preferably using an async function that later updates the linksObject / DB
                    break;
                case 3: // redirect, eg 301 permanent redirect from /about => /about/
                    var entryLinks = {};
                    entryLinks[headers.location] = 1; // store page to which we're redirected as a link
                    linksObject[target.url] = {statuscode:statuscode, title:'3xx Redirect', links:entryLinks};
                    queue.push({url:headers.location, depth:target.depth}); // dont increase depth with a redirect; seems more intuitive 
                    break;
                case 4: // client error, eg 404 not found
                    linksObject[target.url] = {statuscode:statuscode, title:'4xx Client Error', links:{}};
                    break;
                default: // 0 (result from error in get function), 1xx informational, 5xx server error
                    break;
            }

            next();
        })
    };


    // convert seedUrls array to a queue object with depth 0 added to it
    for (var i = 0; i < seedUrls.length; i++) {
        queue.push({url:seedUrls[i], depth:0});
    }
    console.log("seeding queue: " + JSON.stringify(queue));

    // finally, start the process! By starting only 5, we limit the concurrent requests (to 5) 
    for (var i = 0; i< 5; i++) {
        if (queue.length > 0) process(queue.pop() );    
    }


};  
