
var baseUrl = location.href.match(/^http:\/\/[^/]+/)[0];

var fadingState = {
    atrootpage: (baseUrl + '/' === location.href) ? true : false,
    navigationOpen: (baseUrl + '/' === location.href) ? true : false,
    followingLink: false,
    newPage: null,
    checkLinkFollowing: function() {
        if (this.followingLink && (this.newPage !== null) && this.navigationOpen) {
            this.atrootpage = (baseUrl + '/' === location.href) ? true : false;
            $("#contentcontainer").html($(this.newPage).find("#contentcontainer").html());
            document.title = $(this.newPage).filter('title')[0].text;
            this.followingLink = false;
            this.newPage = null;
            this.closeNavigation();
        }
    },
    openNavigation: function() {
        var self = this;
        $("#maincontainer").fadeOut(function() {
            self.navigationOpen = true; 
            self.checkLinkFollowing();
        }); 
    },
    closeNavigation: function() {
        if (this.atrootpage) return;
        var self = this;
        $("#maincontainer").fadeIn(function() {self.navigationOpen = false; });
    },
    switchNavigation: function() {
        if (this.navigationOpen) this.closeNavigation(); else this.openNavigation();
    },
    followLocalLink: function(href) {
        this.followingLink = true;
        this.openNavigation();
        var self = this;
        $.get(href, function(data, status, jqxhr){
            self.newPage = $.parseHTML(data, null, true);  
            // careful with the keepscripts: make sure content doesnt leak javascript to other pages
            // thus, best to use some kind of module pattern, maybe with require.js, to unload scripts after use, or wrap everything in its own closure..
            // same goes for CSS I guess, but I dont know how to do that yet
            self.checkLinkFollowing();
        });
    },
};

// object that keeps track of the path that the user has taken throughout our website
var breadcrumbs = {
    startTime: new Date(),    
    hist: [{location:location.href, time:0}],
    addPage: function(url) {
        // TODO: dont add page if its already the last entry in the history

        var curTime = new Date();
        var seconds = Math.round((curTime.getTime() - this.startTime.getTime())/1000);
        this.hist.push({location:url, time:seconds});
        if (this.hist.length - 100 > 0) this.hist.splice(0, this.hist.length - 100); //dont keep track of infinite history

        //TODO: update graph to show the new info
    },
    compareAndMerge: function(state) {
        // we could check here if there's info in the state thats not in this object,
        // and then add that state at the beginning of the array

        //TODO: check if this page is already the last entry in the array
        breadcrumbs.addPage(location.href);
    }    
};

// pass on the return value of linkClicked (return value of false prevents normal/further handling of the link click)
$(document).on("click", "a", function() { 
  if (typeof $(this).attr("href") !== "undefined") return linkClicked($(this).attr("href"));
  if (typeof $(this).attr("xlink:href") !== "undefined") return linkClicked($(this).attr("xlink:href")); // links in the svg look like this
}); 

// This function intercepts link clicks to add animations if we move to other parts of this website
// This works perfectly under two conditions: links to other parts of this website are relative and they dont contain colons (":")
// So, just keep it simple and satisfy those two conditions, they're ok general rules anyway!
function linkClicked(href) {
    console.log("link clicked " + href);
    // However, extension to cover those two conditions as well is not particularly hard, eg use document.URL to check whether we stay at the same website
    // and use URI.js to help with url parsing. (only relative links that include a : but not a / before the : will always stay nasty.
    // that has nothing to do with us though)
    // full ruleset for a complete implementation:
    // if we have a : before a / , it should be an absolute url
    // if we have a : but not a / , it should be an absolute url
    // if we have a / before a : , it should be a relative url
    // if we dont have a : but we do have a / , it should be a relative url
    // if we dont have a : and also no / , it should be a relative url

    // optionally check other attributes to make sure we dont intercept download links and possibly other stuff
    // see if we also want to keep track of area links

    if (href.indexOf(":") != -1) {
        //breadcrumbs.addPage(href);
        //window.history.replaceState(breadcrumbs.hist, "title: " + href);
        return true; // we have a link to a different domain / protocol.. just let it go through
    }
    
    if (href.lastIndexOf("#", 0) === 0 ) { 
        // we have a link to an anchor on the same page
        // optionally do fancy scrolling and so on, but for now, dont interfere
        return true;
    }
    
    // OK, what we have left should be links to other parts of my website, so add fancy stuff :-)
    // first check if it was actually a link to the root page
    if (href == '/') {
        fadingState.switchNavigation();
        return false;
    }

    breadcrumbs.addPage(href);   
    window.history.pushState(breadcrumbs.hist, "title: " + href, href);
    fadingState.followLocalLink(href);
    return false; //prevent the browser from following the link again
}

// this function allows the back button to work
$(window).on("popstate", function(e) {
    console.log('popstate fired ');    
    breadcrumbs.compareAndMerge(e.originalEvent.state);    
    window.history.replaceState(breadcrumbs.hist, "title: " + location.href);
    fadingState.followLocalLink(location.href);
});

// this is fired when navigating back from a different website for example, or restarting browser (popstate isnt fired in those cases)
$(document).ready(function() {
    console.log('ready fired ');    
    breadcrumbs.compareAndMerge(window.history.state);    
    window.history.replaceState(breadcrumbs.hist, "title: " + location.href);
});

// a keyboard shortcut for navigation on a computer, pressing z (key 90) opens up graph
var zpressed = false;
$(window).on("keydown", function(e) {
    if (e.which == 90 && !zpressed) { // cause event fires continuously when you keep pressing z
        zpressed = true;   
        fadingState.switchNavigation();    
    }
});
$(window).on( "keyup", function(e) {
    if (e.which == 90) zpressed = false;
});

