
var baseUrl = location.href.match(/^http:\/\/[^/]+/)[0];
var graphUrl = baseUrl + '/graph.json';
console.log(graphUrl);
var graph = null;

//check if we're at the main index page
// (if so, we always want to show the navigation graph and not the image behind)
if (baseUrl + '/' === location.href) { 
    $("#contentcontainer").fadeOut(0); 
    $("#graphcontainer").css({'visibility':'visible', 'z-index':20}).fadeIn(0);
} 

// one large object to control the fading state
// TODO: one problem remains: the first time we're fading in, it doesnt work properly for some reason that has to do with the CSS
//       (the complete function is fired too quickly)
//       however, if we fix that, somehow the graph is not drawing anymore at all... see what is actually the problem there.. (probably visjs)
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
        $("#contentcontainer").fadeOut(); 
        $("#graphcontainer").css({'visibility':'visible', 'z-index':20}).fadeIn(function() {
            self.navigationOpen = true; 
            self.checkLinkFollowing();
        });
    },
    closeNavigation: function() {
        if (this.atrootpage) return;
        var self = this;
        $("#contentcontainer").fadeIn();
        $("#graphcontainer").css({'z-index':0}).fadeOut(function() {self.navigationOpen = false; });
    },
    switchNavigation: function() {
        if (this.navigationOpen) this.closeNavigation(); else this.openNavigation();
    },
    followLocalLink: function(href) {
        this.followingLink = true;
        this.openNavigation();
        var self = this;
        $.get(href, function(data, status, jqxhr){
            self.newPage = $.parseHTML(data);
            //TODO (actually check what happens with scripts now and if jquery can do something for us)
            // first hunt down any css and javascript in the page and add it at the end of the head for css and 
            // also keep track of it, in order to remove it again when we leave the page (maybe even use a module 
            // pattern for the JS so that we can actually free the memory again when we leave? that would be really neat!) => require.js
            
            self.checkLinkFollowing();
        });
    },
};


// get the information for drawing the dynamic navigation menu
$.get(graphUrl, function(data, status, jqxhr){
    //TODO: test for errors and so on

    //make some pretty colors
    for (var i = 0; i < data.nodes.length; i++) {
        if (data.nodes[i].url.indexOf(':') == -1) data.nodes[i].color = 'green';    
        if (data.nodes[i].statuscode == 404) data.nodes[i].color = 'red';
        if (data.nodes[i].statuscode == 301) data.nodes[i].color = 'orange';  
    }

   
    //draw the graph :-)
    graph = new vis.Network($("#graphcontainer").get(0), data);

    //add links to pages!
    graph.on('select', function(props) {
        // this works, but TODO we have to calculate the proper coordinates and translate it during animation (see focusOnNode in visjs )        
        //graph._setTranslation(1,1);
        //graph.redraw();

    });

    graph.on('doubleClick', function(props) {
        console.log(JSON.stringify(props));
        console.log(graph.nodesData.get(props.nodes[0]).label); //this is the label we shouild link to
        if (linkClicked(graph.nodesData.get(props.nodes[0]).url)){
            //wasnt touched by linkClicked because it was an external link, so send browser there ourselves
            window.location = graph.nodesData.get(props.nodes[0]).url;
        };
    });
});

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
$(document).on("click", "a", function() { return linkClicked($(this).attr("href")); }); 

// This function intercepts link clicks to add animations if we move to other parts of this website
// This works perfectly under two conditions: links to other parts of this website are relative and they dont contain colons (":")
// So, just keep it simple and satisfy those two conditions, they're ok general rules anyway!
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
