This is the repository containing my personal website that is hosted on Github Pages. 

## How to use

* Clone this repo and optionally remove all my content
* Add new content, just make a folder with the page name and put a index.jade file in it, optionally referring to a markdown file
* Make sure you have installed grunt (npm install -g grunt-cli) and if you use markdown, something to process it (npm will give suggestions, eg marked)
* I've defined the following grunt tasks: 
  * web: start a NodeJS webserver at localhost:8001 that mimicks the Github Pages server for local testing
  * graphfile: try to crawl the website locally and build a file that describes all the links in the website
  * crawl: start the NodeJS server and build the graphfile
  * jade: build html files from the jade files
  * publish: process the jade files to html and crawl the site to build the graphfile; site is ready to push to Github Pages after this task
  * server: start the NodeJS server and watch for changes
  * default: do everything: process jade files, start server, crawl to make the graphfile, and watch for changes

## Licenses

### Website infrastructure and design

Files in the main directory and the layouts, static and tools directory are part of the site infrastructure and are licensed under an Apache v2 license, unless stated otherwise. I considered using GPL v3, but that can result in issues when using the code to present CC BY 4.0 content with it. The license can be found in the CODE-LICENSE.txt file or at [http://www.apache.org/licenses/LICENSE-2.0.html](http://www.apache.org/licenses/LICENSE-2.0.html). 

### Website content

Files in the folders that have a name starting with a capital letter are part of the website content and are licensed under a CC BY 4.0 license, unless stated otherwise. The license can be found in the CONTENT-LICENSE.txt file or at [https://creativecommons.org/licenses/by/4.0/](https://creativecommons.org/licenses/by/4.0/).

Note, images are part of the content; TODO: better organize stuff to more clearly seperate CC BY 4.0 licensed stuff from Apache V2 licensed stuff..
