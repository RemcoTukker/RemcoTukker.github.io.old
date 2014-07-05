
var baseUrl = location.href.match(/^http:\/\/[^/]+/)[0];
var graphUrl = baseUrl + '/website.dot';
console.log(graphUrl);
var graph = null;

//check if we're at the main index page
// (if so, we always want to show the navigation graph and not the image behind)
console.log(baseUrl);
console.log(location.href);
if (baseUrl + '/' === location.href) { // todo handle trailing /
    $("#contentcontainer").fadeOut(0); 
    $("#graphcontainer").css({'visibility':'visible', 'z-index':20}).fadeIn(0);
}
//TODO: when pressing z this disappears anyway, fix this better

// get the information for drawing the dynamic navigation menu
$.get(graphUrl, function(data, status, jqxhr){
    //TODO: test for errors and so on
    
    //draw the graph :-)
    graph = new vis.Graph($("#graphcontainer").get(0), data);

    //add links to pages!
    graph.on('select', function(props) {
        console.log(JSON.stringify(props));
        //graph.focusOnNode(props.nodes[0]);
        console.log(graph.nodesData.get(props.nodes[0]).label); //this is the label we shouild link to
        console.log(graph.nodesData.get(props.nodes[0]).label2); //this is a label with additional info.. how to display?

        // this works, but TODO we have to calculate the proper coordinates and translate it during animation (see focusOnNode in visjs )        
        //graph._setTranslation(1,1);
        //graph.redraw();
        if (linkClicked(graph.nodesData.get(props.nodes[0]).label)){
            //wasnt touched by linkClicked because it was an external link
            window.location = graph.nodesData.get(props.nodes[0]).label;
        };
    });

// note: make sure vis is loaded already.. actually, how do we make sure jquery is loaded already? For now, put them in head
// later, better use requirejs or something similar!

});



// object that keeps track of the path that the user has taken throughout our website
var breadcrumbs = {
    startTime: new Date(),    
    hist: [{location:location.href, time:0}],
    addPage: function(url) {
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

console.log('script started: ' + JSON.stringify(breadcrumbs.hist) + ' ' + JSON.stringify(window.history.state));


// object to control fading
var fadingState = {
    
    navigationOpen: false,
    newContent: null,
    newPageAvailable: true, 
    oldPageFaded: true,
    start: function() {
        this.newPageAvailable = false; 
        this.oldPageFaded = false;
        var self = this;
        $("#contentcontainer").fadeOut(function() { self.oldPageFaded = true; self.checkCompletion(); });
        //future: $("#contentcontainer").fadeOut(() => { this.oldPageFaded = true; this.checkCompletion(); });
        $("#graphcontainer").css({'visibility':'visible', 'z-index':20}).fadeIn();
    },
    pageLoaded: function(page) {
        this.newPageAvailable = true; 
        this.newContent = page; 
        this.checkCompletion(); 
    },
    checkCompletion: function() { 
        if (this.newPageAvailable && this.oldPageFaded) {
            //$("#contentcontainer").empty(); // this may be necessary to clean up related javascript
            $("#contentcontainer").html(this.newContent);
            $("#contentcontainer").fadeIn();
            $("#graphcontainer").css({'z-index':0}).fadeOut();
        }
    },
    openNavigation: function() {
        if (this.navigationOpen) return; 
        this.navigationOpen = true;  
        $("#contentcontainer").fadeOut(); 
        $("#graphcontainer").css({'visibility':'visible', 'z-index':20}).fadeIn();
    },
    closeNavigation: function() {
        if (!this.navigationOpen) return;
        var self = this;
        $("#contentcontainer").fadeIn();
        $("#graphcontainer").css({'z-index':0}).fadeOut(function() {
            self.navigationOpen = false;
        });
    }

};

// function that loads a new page on our website
function getNewPage(href) {
    
   fadingState.start();

   //get gives us some more flexibility than load, check later if maybe load is sufficient
   // TODO: include some info on navigation history for statistics of user behavior
   $.get(href, function(data, status, jqxhr){

        var newpage = $.parseHTML(data);
        
        //TODO (actually check what happens with scripts now and if jquery can do something for us)
        // first hunt down any css and javascript in the page and add it at the end of the head for css and 
        // also keep track of it, in order to remove it again when we leave the page (maybe even use a module 
        // pattern for the JS so that we can actually free the memory again when we leave? that would be really neat!)
        
        // now let the fadingState know we are ready for replacing the contents
        fadingState.pageLoaded($(newpage).filter("#contentcontainer").html());
    });

}

// This function intercepts link clicks to add animations if we move to other parts of this website
// This works perfectly under two conditions: links to other parts of this website are relative and they dont contain colons (":")
// So, just keep it simple and satisfy those two conditions, they're ok general rules anyway!
$(document).on("click", "a", function() { linkClicked($(this).attr("href")); });

function linkClicked(href) {
    //console.log(this);
    // However, extension to cover those two conditions as well is not particularly hard, eg use document.URL to check whether we stay at the same website
    // and use URI.js to help with url parsing. (only relative links that include a : but not a / before the : will always stay nasty.
    // that has nothing to do with us though)
    // full ruleset for a complete implementation:
    // if we have a : before a / , it should be an absolute url
    // if we have a : but not a / , it should be an absolute url
    // if we have a / before a : , it should be a relative url
    // if we dont have a : but we do have a / , it should be a relative url
    // if we dont have a : and also no / , it should be a relative url

    //this: the link that was clicked
    //var href = $(this).attr("href");
    
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
    breadcrumbs.addPage(href);   
    window.history.pushState(breadcrumbs.hist, "title: " + href, href);
    getNewPage(href);    
    return false; //prevent the browser from following the link again
}

// this function allows the back button to work
$(window).on("popstate", function(e) {
    console.log('popstate fired ');    
    breadcrumbs.compareAndMerge(e.originalEvent.state);    
    window.history.replaceState(breadcrumbs.hist, "title: " + location.href);
    getNewPage(location.href);
});

// this is fired when navigating back from a different website for example, or restarting browser (popstate isnt fired in those cases)
$(document).ready(function() {
    console.log('ready fired ');    
    breadcrumbs.compareAndMerge(window.history.state);    
    window.history.replaceState(breadcrumbs.hist, "title: " + location.href);
});

// a shortcut for navigation on a computer, pressing z opens up graph
$(window).on( "keydown", function(e) {
    //console.log(e.which); //z is 90
    if (e.which == 90) fadingState.openNavigation();    
});
$(window).on( "keyup", function(e) {
    if (e.which == 90) fadingState.closeNavigation();
});
