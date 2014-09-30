/*
 * Pretty short and sweet code for graph layout. R Tukker (2014)
 * TODO:
 *   Some small improvements found in the TODO s throughout the code
 *   Separate x and y force constants
 *   Maybe add some noise to break symmetry in cases of instable equilibrium
 *   Maybe handle particles on exactly the same position better  
 */ 

// variable to store our particles in; will look like this: 
// {"id":{x:30, y:40, mass:1, fx:0, fy:0, xold:30, yold:40, edges:["id1", "id2"] }, "id2":{...}}
// fx and fy property for the force on the particle, are reset everytime update starts
// xold and yold last position for the Verlet integration, can be used to give starting speed
// edges is an array with ids of the particles it connects to with a spring
var particles = {}; 

// variable to keep the timeout ID of the next timestep; global so that we can stop the updating loop
var timeoutID = null;

// flag to show that we have stopped the simulation because nothing was changing anymore and that we should kick off again in case of external changes
var autopaused = false;

// variable for the options / settings of the simulation (all lowercase keys so that we can do toLowerCase() preventing user frustration)
var opt = {
  gravity: -8000,                 // attraction / repulsion between the particles, approximated by Barnes-Hut
  oneovertheta: 2,               // for Barnes-Hut approximation
  maxquaddepth: 64,              // how deep the quadtree is allowed to get before merging particles into same quad; 64 gives a pretty good range
  centeringforce: 0.00001,       // for the center pointing 'gravity'
  friction: 1.2,                 // should be >= 0   ; 0.9 seems ok
  springlength: 30,              // equilibrium length of springs
  springconstant: 1,
  reciprocalspring: false,       // whether a spring should exert a force on both nodes or only on the initiating side of an edge
  targetfps: 60,                 // should be > 0
  dt: 0.1                        // dt in the Verlet integration. This is effectively scaling all other forces, resulting in speed up/down
};

// function to process incoming message
onmessage = function (evt) {
  // first check if we have a start / stop message (or another string), and if so, do whats requested and return
  if (typeof evt.data == 'string') {
    if (evt.data.toLowerCase() == "stop" || (evt.data.toLowerCase() == "start" && timeoutID != null)) clearTimeout(timeoutID); // cancel next timestep
    if (evt.data.toLowerCase() == "start") timestep(false);                                             // kick off simulation
    return;
  }

  // otherwise we should have an object, so just loop over all the keys in the object and see what we can do with them
  for (var key in evt.data) {

    // check if we have an object in the object, which means a new / changed particle
    if (typeof evt.data[key] == 'object') {                     
      // check if we should delete the particle, and if so, continue to the next key
      if (evt.data[key].mass == 0) {                                        
        delete particles[key];      
        continue;                                                          
      }
      // see if the user want to set x/y, and if so, also set xold/yold, unless user supplied their own
      if ((typeof evt.data[key].x != undefined) && (typeof evt.data[key].xold == 'undefined')) evt.data[key].xold = evt.data[key].x; 
      if ((typeof evt.data[key].y != undefined) && (typeof evt.data[key].yold == 'undefined')) evt.data[key].yold = evt.data[key].y; 
      // if new particle, add it with defaults
      if (!particles[key]) particles[key] = {x:0, y:0, mass:1, fx:0, fy:0, xold:0, yold:0, edges:[]};  
      // finally, copy over all properties that should be changed
      for (var particleProperty in evt.data[key]) {                                                   
        // TODO maybe check whether it is actually numbers or an array with strings that we're copying
        // only copy existing options
        if (typeof particles[key][particleProperty] != 'undefined') particles[key][particleProperty] = evt.data[key][particleProperty];
      }
    
    // if its not an object, we try to see if the user wants to set one of our options
    } else { 
      // only copy existing options
      if (typeof opt[key.toLowerCase()] != 'undefined') { 
        // TODO check if we dont violate any of the conditions that are noted in the comments at the opt object
        opt[key.toLowerCase()] = evt.data[key];
      }
    }

  }

  // lets assume something actually changed; so, in case we autopaused before, we should start again
  if (autopaused) {
    autopaused = false;
    timestep(false);
  }

};

// the actual math
function timestep(oneStepOnly) {

  // first build the quadtree for Barnes-Hut
  // will have the following form: [{originx: 0, originy: 0, halfLength:1, depth:3, CoMx:1, CoMy:1, CoMm:1, children:[1,2,3,4]}, {...}, ]
  // TODO make quadtree global and reuse quadtree nodes to prevent GC from picking them up
  var quadtree = [];

  // this function adds a particle to the quadtree (updating CoMs, making child nodes, and getting the particles in the right node)
  var addParticle = function(nodeid, particle) {
    // first update the center of mass
    var node = quadtree[nodeid];
    var oldCoMm = node.CoMm, oldCoMx = node.CoMx, oldCoMy = node.CoMy;
    node.CoMm += particle.mass;
    node.CoMx = node.CoMm ? (oldCoMx * oldCoMm + particle.x * particle.mass) / node.CoMm : 0; //parsing the float as bool is okay here??
    node.CoMy = node.CoMm ? (oldCoMy * oldCoMm + particle.y * particle.mass) / node.CoMm : 0;
  
    // first lets see if we should refer this particle to one of our children
    if (node.children) {  // should work because we always store an array in there; refer particle to one of the children
      return addParticle( node.children[ (particle.x < node.originx) + 2*(particle.y < node.originy) ], particle); // parsing bool as int here
    }

    // finally lets see if we should split this node. Only split if this node wasnt empty and we havent reached maxDepth yet
    // note that this means that particles that are close together feel their own gravity later on, but well, in this limit the simulation is inaccurate anyhow
    if (node.CoMm != particle.mass && node.depth < opt.maxquaddepth ) { // apparently we updated a non-empty leave node
      node.children = [quadtree.length, quadtree.length + 1, quadtree.length + 2, quadtree.length + 3]; 
      var l = 0.5 * node.halfLength; // create the 4 children
      quadtree.push({originx: node.originx + l, originy: node.originy + l, halfLength: l, depth: node.depth + 1, CoMx:0, CoMy:0, CoMm:0}); 
      quadtree.push({originx: node.originx - l, originy: node.originy + l, halfLength: l, depth: node.depth + 1, CoMx:0, CoMy:0, CoMm:0}); 
      quadtree.push({originx: node.originx + l, originy: node.originy - l, halfLength: l, depth: node.depth + 1, CoMx:0, CoMy:0, CoMm:0}); 
      quadtree.push({originx: node.originx - l, originy: node.originy - l, halfLength: l, depth: node.depth + 1, CoMx:0, CoMy:0, CoMm:0}); 
      // add the two particles to their respective leaves (may be the same)
      addParticle( node.children[ (particle.x < node.originx) + 2*(particle.y < node.originy) ], particle); 
      addParticle( node.children[ (oldCoMx < node.originx) + 2*(oldCoMy < node.originy) ], {x: oldCoMx, y: oldCoMy, mass: oldCoMm}); 
    } 
  }

  // get the extremeties to make the root quad
  var maxx = -Number.MAX_VALUE, maxy = -Number.MAX_VALUE, minx = Number.MAX_VALUE, miny = Number.MAX_VALUE;
  for (var i in particles) {
    maxx = Math.max(particles[i].x, maxx);
    maxy = Math.max(particles[i].y, maxy);
    minx = Math.min(particles[i].x, minx);
    miny = Math.min(particles[i].y, miny);
  }
  if (maxy == miny) maxy += 1; // we dont want a 0-sized root quad, eg in case of 1 particle
  if (maxx == minx) maxx += 1;
  quadtree.push({originx: (maxx + minx)/2, originy: (maxy + miny)/2, halfLength: Math.max((maxx - minx)/2, (maxy - miny)/2), depth: 0, CoMx:0, CoMy:0, CoMm:0}); 

  // finally, insert all the particles in the tree, and we're done already
  for (var i in particles) {
    addParticle(0, particles[i]);
  }

  // loop through all particles to calculate their new force and speed
  for (var i in particles) {
    particles[i].fx = 0;
    particles[i].fy = 0;

    // first component: the Barnes Hut repulsion / attraction (direct summation is better for small number of particles, but Barnes Hut scales a bit better)
    var calculateForce = function(nodeId) {
      var node = quadtree[nodeId];
      if ((node.CoMm == 0) && (!node.children)) return; // empty leaf node
      var distance = Math.sqrt( (node.CoMx - particles[i].x) * (node.CoMx - particles[i].x) + (node.CoMy - particles[i].y) * (node.CoMy - particles[i].y) );
      if ( (!node.children) || (distance * 0.5 / node.halfLength > opt.oneovertheta) ) { 
        if (distance == 0 && node.CoMm == particles[i].mass) return; // this is only the particle itself, quickly return
        if (distance == 0) { //cannot find direction of force, use random direction (TODO even better would be to use existing speed direction (?), but would be hairy (?))
           var fakefg = opt.gravity * particles[i].mass * node.CoMm / (node.halfLength * node.halfLength);
           var angle = Math.random() * 2 * Math.PI;
           particles[i].fx += fakefg * Math.sin(angle);         
           particles[i].fy += fakefg * Math.cos(angle);         
        } else {
          var fg = opt.gravity * particles[i].mass * node.CoMm / (distance * distance); 
          particles[i].fx += (node.CoMx - particles[i].x) * fg / distance;         
          particles[i].fy += (node.CoMy - particles[i].y) * fg / distance;         
        }       
      } else {
        calculateForce(node.children[0]);
        calculateForce(node.children[1]);
        calculateForce(node.children[2]);
        calculateForce(node.children[3]);
      }      
    }
    
    calculateForce(0); // kick off the recursive calculation

    // second component: spring forces based on the edges
    for (var j = 0; j < particles[i].edges.length; j++) {
      if (typeof particles[i].edges[j] == 'undefined' || particles[i].edges[j] == i) continue; // non-existing endpoint or self-connection
      var deltax = particles[ particles[i].edges[j] ].x - particles[i].x;
      var deltay = particles[ particles[i].edges[j] ].y - particles[i].y;
      var delta = Math.sqrt(deltax*deltax + deltay*deltay);
      var fspring = opt.springconstant * ( delta - opt.springlength);
      if (delta == 0) { //cannot find direction of force, use random direction (TODO even better would be to use existing speed direction (?), but would be hairy (?))
        var angle = Math.random() * 2 * Math.PI;
        particles[i].fx += Math.sin(angle) * fspring; 
        particles[i].fy += Math.cos(angle) * fspring; 
        if (opt.reciprocalsprings) {
          particles[ particles[i].edges[j] ].fx -= sin(angle) * fspring;
          particles[ particles[i].edges[j] ].fx -= cos(angle) * fspring;
        }
      } else {
        particles[i].fx += fspring * (deltax / delta);
        particles[i].fy += fspring * (deltay / delta); 
        if (opt.reciprocalsprings) { 
          particles[ particles[i].edges[j] ].fx -= fspring * deltax / delta;
          particles[ particles[i].edges[j] ].fy -= fspring * deltay / delta;
          // note that we also exert the force from the other side, not really a problem though (unless you want one-way edges to be the same as two-way edges)
        }
      }
    }

    // third component: central pointing force to prevent stuff from floating off too much 
    // these equations implement a central pointing force that is ~distance^3 to create a nice well to live in
    var rsquared = particles[i].x*particles[i].x + particles[i].y*particles[i].y; // optionally add sqrt here to make force ~distance^2
    particles[i].fx -= opt.centeringforce * particles[i].x * rsquared; 
    particles[i].fy -= opt.centeringforce * particles[i].y * rsquared;

  }

  // already prepare the msg object that we are going to send
  var msg = {};
  var msgEmpty = true;

  // calculate a provisional position delta in order to find out what the force of friction should be
  for (var i in particles) {
    // we're using Verlet integration
    var provisionalDeltax = particles[i].x - particles[i].xold + particles[i].fx / particles[i].mass * opt.dt * opt.dt;
    var provisionalDeltay = particles[i].y - particles[i].yold + particles[i].fy / particles[i].mass * opt.dt * opt.dt; 
    var delta = Math.sqrt(provisionalDeltax*provisionalDeltax + provisionalDeltay*provisionalDeltay);
    if (delta != 0 && delta != Infinity) {
      particles[i].fx -= opt.friction * (provisionalDeltax/delta); // apply friction
      particles[i].fy -= opt.friction * (provisionalDeltay/delta);
    }

    // and immediately find the new, final deltax and deltay
    var deltax = particles[i].x - particles[i].xold + particles[i].fx / particles[i].mass * opt.dt * opt.dt;
    var deltay = particles[i].y - particles[i].yold + particles[i].fy / particles[i].mass * opt.dt * opt.dt; 
    // prevent friction from changing the direction of movement (it would result in very small oscillations when no external force is applied)
    if ((deltax < 0) != (provisionalDeltax < 0)) deltax = 0;
    if ((deltay < 0) != (provisionalDeltay < 0)) deltay = 0;

    // finally, update positions
    var currentx = particles[i].x;
    var currenty = particles[i].y;
    var v = Math.sqrt(deltax*deltax + deltay*deltay);
    if (v > quadtree[0].halfLength) { // enforces max speed, also deals with +/- Inf forces // TODO: allow for a configurable max speed
      deltax = Math.max(-Number.MAX_VALUE, Math.min(deltax, Number.MAX_VALUE) );
      deltay = Math.max(-Number.MAX_VALUE, Math.min(deltay, Number.MAX_VALUE) );
      deltax = deltax / ( (v == Infinity) ? Number.MAX_VALUE : v ) *  quadtree[0].halfLength;
      deltay = deltay / ( (v == Infinity) ? Number.MAX_VALUE : v ) *  quadtree[0].halfLength;
    }
    particles[i].x += deltax;
    particles[i].y += deltay;
    particles[i].x = Math.max(-Number.MAX_VALUE, Math.min(particles[i].x, Number.MAX_VALUE) ); // should almost never do anything, but better be safe than sorry!
    particles[i].y = Math.max(-Number.MAX_VALUE, Math.min(particles[i].y, Number.MAX_VALUE) ); 
    particles[i].xold = currentx;
    particles[i].yold = currenty;

    if (deltax != 0 || deltay != 0) {
      msg[i] = {dx:deltax, dy:deltay}; // add to the message we are going to send if this particle is actually moving
      msgEmpty = false;
    }
  }

  // post deltas back if there's any; note that only sending deltas _can_ lead to desyncs (TODO check if this actually happens.. dont think so)
  // should look like: {"id1":{"dx":0, "dy":21}, "id2": {...}, ...}
  if (msgEmpty) {
    postMessage("autopausing");
    autopaused = true;
  } else {
    postMessage(msg);
    // post a timeout for the next timestep based on target fps (and assuming this function runs instantly)
    if (opt.targetfps > 0) timeoutID = setTimeout(timestep, 1000/opt.targetfps);
  } 
 
}
