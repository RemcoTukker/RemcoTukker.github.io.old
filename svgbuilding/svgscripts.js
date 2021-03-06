
// TODO we can move this code to a separate repo as well :-)
var addAnimationToGraph = function(config) {

    var defaultConfig = {
        svgID: "svg",             // ID of the svg element that should catch mouse clicks and touches
    }
    config = config || {};
    for (var key in defaultConfig) if (typeof config[key] == "undefined") config[key] = defaultConfig[key];

    // our reference to the svg that contains the nodes
    var svg = document.getElementById(config.svgID);       

    // variables for dragging nodes 
    var dragging = null;           // this will contain a reference to the node that is being dragged
    var previousx, previousy;      // previous x and y coordinates


    // first read the existing graph 
    // create an object with references to all our existing graph nodes
    nodeElements = document.getElementsByClassName('graphnode'); // svg.getElementsByClassName gives an error in IE; it would be better though
    var nodes = {};
    var nodeNrs = {};
    for (var i = 0; i < nodeElements.length; i++) {
        var tf = nodeElements[i].transform.baseVal.getItem(nodeElements[i].transform.baseVal.numberOfItems - 1);
        nodes[nodeElements[i].id] = {x:tf.matrix.e, y:tf.matrix.f, edges:[]}; // TODO edges to be added later
        nodeNrs[nodeElements[i].id] = i; // for later reference
    }
    // TODO also read edge elements from the svg


    // instantiate physics worker
    var physicsWorker = new Worker("/static/js/physics.js");  
    // TODO: make this a data URI
    // TODO: allow for overriding the default config of the physics worker from here

    // sending and receiving messages from the worker
    physicsWorker.addEventListener("message", function (evt) {
      if (evt.data == 'autopausing') return;
      for (var i in evt.data) {
        if (dragging != null && dragging.id == i) continue; // dont update position of a node that we are currently dragging

        var node = nodeElements[nodeNrs[i]]; // look up the node thats associated with this ID

        var tf = node.transform.baseVal.getItem(node.transform.baseVal.numberOfItems - 1);  // TODO just keep an object with references to all tf matrices
        var tfMatrix = tf.matrix;
        tfMatrix = tfMatrix.translate(evt.data[i].dx, evt.data[i].dy);
        tf.setMatrix(tfMatrix);
      }
    });

    function updatePhysicsWorkerWhenDraggingNode(nodeId, x, y, oldx, oldy) {
      // send the current info of node with id nodeId to the physicsworker (x, y and maybe also do the xold and yold)
      var msg = {};
      msg[nodeId] = {x:x, y:y, xold: oldx, yold: oldy};
      physicsWorker.postMessage(msg);
    }


    // update the node info in the worker in the following way:
    // {"node1":{mass:1, x:30, y:40, edges:["node2", ... ]}, "node2":{...}}
    // nodes or properties that are not mentioned are assumed unchanged; remove a node by putting its mass to 0
    // nodes are added when they are mentioned with default mass 1 and default location at the origin
    //var testgraph = {"1":{edges:["2","3"]}, "2":{edges:["1"]}, "3":{edges:["1"]}};
    physicsWorker.postMessage(nodes); 
    physicsWorker.postMessage("start"); // start the worker.
    //physicsWorker.postMessage("stop"); // pause the worker.

    // TODO expose starting / stopping animation as an interface of this module


    // code for dragging of nodes
    function nodeMouseDown(evt) {
      // find out if its a mouse down on a graphnode (we may get ellipse in the group here or the text inside the ahref inside the group)
      //  ... yes, the following is fragile... dont do any extra nesting in the graphnode for now; TODO: improve, search upwards till you either found a graphnode or reached top of svg
      if (evt.target.parentNode.className.baseVal != "graphnode") return; // && evt.target.parentNode.parentNode.className.baseVal != "graphnode") return;

      evt.stopPropagation(); // if youre touching a node, we dont want to pan the image at the same time
      
      // if (evt.target.tagName.toLowerCase() != "ellipse") return; // only drag the node when you touch the ellipse (not the text/hyperlink)
      if (evt.target.tagName.toLowerCase() == "text") return; // dont interfere with hyperlink dragging
     
      dragging = evt.target.parentNode;
      previousx = evt.clientX;
      previousy = evt.clientY;
      
      return false;
    }

    // Convert screen-based coordinates (eg from mouse events) into the panzoom coordinate system
    function screenToPanZoomCoords(x, y) {
      var pt = svg.ownerSVGElement.createSVGPoint();  // TODO use ownerSVGElement properly, also in the panzoom code to fix bug if svgID is not the actual svg
      pt.x = x;
      pt.y = y;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }

    function nodeMouseMove(evt) {
      if (!dragging) return;
      var oldPt = screenToPanZoomCoords(previousx, previousy);
      var newPt = screenToPanZoomCoords(evt.clientX, evt.clientY);
      var dx = newPt.x - oldPt.x;
      var dy = newPt.y - oldPt.y;
      previousx = evt.clientX;
      previousy = evt.clientY;

      var tf = dragging.transform.baseVal.getItem(dragging.transform.baseVal.numberOfItems - 1);
      var tfMatrix = tf.matrix;
      tfMatrix = tfMatrix.translate(dx, dy);
      tf.setMatrix(tfMatrix);

      updatePhysicsWorkerWhenDraggingNode(dragging.id, newPt.x, newPt.y, oldPt.x, oldPt.y);  // check if we are feeding the right data here actually, it was oldx / oldx+dx
      return false;
    }

    function nodeMouseUp(evt) {
      dragging = null;
    }

    function nodeDragStart(evt) {
      if (evt.target.parentNode.className.baseVal != "graphnode") return; // TODO: improve, just as above
      evt.stopPropagation();
       // we may get "a" here for a link or "ellipse" or other stuff of course..
      if (evt.target.tagName.toLowerCase() == "a") return; // dont interfere with hyperlink dragging
      evt.preventDefault(); // but otherwise, dont even think about dragging my elements!
    }

    // adding the event listeners
    svg.addEventListener('mousedown', nodeMouseDown );
    svg.addEventListener('mousemove', nodeMouseMove );
    svg.addEventListener('dragstart', nodeDragStart ); 
    svg.addEventListener('mouseup', nodeMouseUp );
    svg.addEventListener('dragend', nodeMouseUp );   // to stop node from being captured after dragging hyperlink
    svg.addEventListener('mouseleave', nodeMouseUp ); 

    // TODO also add touch events, just like with panzoom code
};

addAnimationToGraph({svgID: "svgpanzoom"});


// TODO get this from github repo when building this svg
// adding pan/zoom interaction to the graph
var addPanZoomToSVG = function(config) {

    /* ===== take care of config ===== */
    var defaultConfig = {
        svgID: "svg", // ID of the svg element that should catch mouse clicks and touches
        panzoomID: "panzoom", // ID of the element that should be panzoomed
        scrollSpeed: 5, // Speed of scroll zooming
        pinchSpeed: 1, // Speed of pinch zooming (5 times smaller than scrollSpeed is an ok choice)
        upOnMouseOut: false // treat mouse leaving svg area as a mouseup event
    }

    config = config || {};
    for (var key in defaultConfig) if (typeof config[key] == "undefined") config[key] = defaultConfig[key];

    // set up the panzoom transform we're going to use
    var svg = document.getElementById(config.svgID);
    var panzoom = document.getElementById(config.panzoomID);
    panzoom.transform.baseVal.appendItem(panzoom.transform.baseVal.createSVGTransformFromMatrix(svg.createSVGMatrix()));
    var tf = panzoom.transform.baseVal.getItem(panzoom.transform.baseVal.numberOfItems - 1);
    var tfMatrix = tf.matrix;

    // mouse and touches state; this object will hold all the locations of touches / mouse, accessed by a touch ID
    var ongoingTouches = {};

    /* ===== functions for panning and zooming ===== */

    // Convert screen-based coordinates (eg from mouse events) into the panzoom coordinate system
    function screenToPanZoomCoords(x, y) {
        var pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        return pt.matrixTransform(panzoom.getScreenCTM().inverse());
    }

    // pan the image a certain distance (from screen coords to screen coords)
    function pan(xold, yold, xnew, ynew) {
        var pt1 = screenToPanZoomCoords(xold, yold); // to make sure we always use the newest transform
        var pt2 = screenToPanZoomCoords(xnew, ynew);
        tfMatrix = tfMatrix.translate(pt2.x - pt1.x, pt2.y - pt1.y);
        tf.setMatrix(tfMatrix);
    }

    // zoom the image at a certain x y location (in screen coordinates)
    function zoom(x, y, factor) {
        var pt = screenToPanZoomCoords(x, y);
        tfMatrix = tfMatrix.translate(pt.x, pt.y).scale(factor).translate(-pt.x, -pt.y); // first translate x and y to origin, then zoom, then translate origin back to x y
        tf.setMatrix(tfMatrix);
    }

    /* ===== functions for handling of events ===== */

    // Calculate average point of ongoingTouches and the total distance from that point to touches; ongoingTouches must not be empty!
    function touchLocationAndRadius() {
        var x = 0, y = 0, rsquared = 0;
        for (var key in ongoingTouches) {
            x += ongoingTouches[key].x;
            y += ongoingTouches[key].y;
        }
        x /= Object.keys(ongoingTouches).length; y /= Object.keys(ongoingTouches).length;
        for (var key in ongoingTouches) rsquared += (ongoingTouches[key].x - x) * (ongoingTouches[key].x - x) + (ongoingTouches[key].y - y) * (ongoingTouches[key].y - y);
        return {x: x, y: y, rsquared: rsquared};
    }
 
   // mousedown / touchstart handling: add item to ongoingTouches object
    function down(evt) {
       if (!evt.changedTouches) evt.changedTouches = [{identifier: "mouse", clientX: evt.clientX, clientY: evt.clientY}]; // make mouse event look like touch event
       for (var i=0; i < evt.changedTouches.length; i++) ongoingTouches[evt.changedTouches[i].identifier] = {x: evt.changedTouches[i].clientX, y: evt.changedTouches[i].clientY};
    }

    // mousemove / touchmove handling
    function move(evt) {

        var touchIds = Object.keys(ongoingTouches);
        if (touchIds.length == 0) return; // no touches going on / mouse not pressed

        evt.preventDefault(); // no scrolling of whole webpage with fingers
        if (!evt.changedTouches) evt.changedTouches = [{identifier: "mouse", clientX: evt.clientX, clientY: evt.clientY}]; // make mouse look like finger

        if (touchIds.length == 1) { // just one finger or mouse => do panning
            pan(ongoingTouches[touchIds[0]].x, ongoingTouches[touchIds[0]].y, evt.changedTouches[0].clientX, evt.changedTouches[0].clientY);
            ongoingTouches[touchIds[0]].x = evt.changedTouches[0].clientX; // update touch info
            ongoingTouches[touchIds[0]].y = evt.changedTouches[0].clientY;
        } else { // multiple fingers => do panning and zooming
            var oldGesture = touchLocationAndRadius(); // get old location and radius
            for (var i=0; i < evt.changedTouches.length; i++) { // update touch info
               ongoingTouches[evt.changedTouches[i].identifier].x = evt.changedTouches[i].clientX;
               ongoingTouches[evt.changedTouches[i].identifier].y = evt.changedTouches[i].clientY;
           }
           var newGesture = touchLocationAndRadius(); // get new location and radius
           pan(oldGesture.x, oldGesture.y, newGesture.x, newGesture.y); // first handle any panning
           var z = Math.pow(newGesture.rsquared / oldGesture.rsquared, config.pinchSpeed); // find out how much we want to zoom
           zoom(newGesture.x, newGesture.y, z); // and then zoom in
        }
    }

    // mousewheel handling
    function wheel(evt) {
        var z = 1 + (0.01 * evt.deltaY / Math.abs(evt.deltaY)) * config.scrollSpeed; // calculate how much we want to scale
        // the Math.abs is to deal with some nasty browser differences in deltaY numbers
        zoom(evt.clientX, evt.clientY, z); // and then zoom in
        evt.preventDefault(); // prevent scrolling of page
    }

    // mouseup / touchend handling
    function up(evt) {
        if (!evt.changedTouches) evt.changedTouches = [{identifier: "mouse"}]; // make mouse look like touch
        for (var i=0; i < evt.changedTouches.length; i++) delete ongoingTouches[evt.changedTouches[i].identifier];
    }

    /* ===== registering event handlers ===== */
    svg.addEventListener('mousedown', down);
    svg.addEventListener('touchstart', down);
    svg.addEventListener('mouseup', up);
    svg.addEventListener('touchend', up);
    svg.addEventListener('touchcancel', up);
    svg.addEventListener('mouseleave', function(evt){ if (config.upOnMouseOut) return up(evt); });
    svg.addEventListener('mousemove', move);
    svg.addEventListener('touchmove', move);
    // The "wheel" event is rather new, see if it works on some older browsers (IE9 comes to mind..)
    svg.addEventListener('wheel', wheel);
    svg.addEventListener('dragstart', function(evt) {evt.preventDefault(); }); // no dragging away svg elements please
    svg.addEventListener('dragend', up); // in case some elements of the svg are in fact allowed to be dragged, prevent panning at dragend

};

addPanZoomToSVG({svgID: "svggraph", panzoomID: "svgpanzoom"});

