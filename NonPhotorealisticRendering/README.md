# Non-Photorealistic Rendering

Demo of a simple and fast (15 year old) method for doing painterly rendering of a video. My plan is to use this for a simple action game at some point.

This algorithm can be improved with stuff like optical flow, foreground/background extraction, etc. I think a lot of that has in fact been done already in more recent research.

I spent quite some time optimizing this so it runs at least reasonably on a fast computer, but I think this code is a very good starting point for trying out asm.js and doing the drawing with the opengl that it supports. 

The demo clip is an excerpt from ["Yosemite Wonders" by Craig F. Skelly](https://archive.org/details/YosemiteWonders), which was released under a [CC-BY-NC license](http://creativecommons.org/licenses/by-nc/2.0/). Note that I have only the ogv clip available as a demo clip at the moment, so if you're on mobile or IE you're out of luck. You can still open video's from your own device that are supported (WebM with VP8 and MP4 with H.264 should work in most cases). 

## Links

* [Painterly Rendering for Video and Interaction](http://www.mrl.nyu.edu/publications/painterly-video/) Work that this demo is based on, by Aaron Hertzmann and Ken Perlin.
* [AniPaint](http://www.dgp.toronto.edu/~donovan/anipaint/) Interactive Painterly Animation From Video by Peter O'Donovan and Aaron Hertzmann. Use this if you want to make such videos yourself.
* [Barbafab](http://www.barbafan.de/html5video?video=tron) Another page doing javascript post-processing on videos.
* [StackBlur](http://www.quasimondo.com/StackBlurForCanvas/StackBlurDemo.html) I use this code by Mario Klingemann for the Gaussian blur step (modified a bit to not touch canvas).
* [Ivan Kuckir Blog](http://blog.ivank.net/fastest-gaussian-blur.html) More fast blur algorithms.
* [Painterly Rendering Demo by Scott Todd](http://scotttodd.github.io/PainterlyRendering/public/) A webgl demo of painterly rendering of 3d objects.
