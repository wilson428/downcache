downcache
=========
Version 0.0.5
[![Build Status](https://travis-ci.org/wilson428/downcache.png)](https://travis-ci.org/wilson428/downcache)

Downcache is a Node.js module for downloading and caching webpages for fast future retrieval. It is modeled on the [download function](https://github.com/unitedstates/congress/blob/master/tasks/utils.py) we use at the [UnitedStates](https://github.com/unitedstates) project.

Any sort of application or project that involves live calls to webpages often ends up hitting them far more often than is reasonably necessary. This module functions like @mikeal's [request](https://github.com/mikeal/request) -- in fact, it uses it as a dependency -- but stores a copy of the HTML on your local machine. The next time you make a request to that page using downcache, it checks for that local copy before making another call to the live page.

#Installation

```npm install downcache``` (local)

```sudo npm install -g downcache``` (global)

#Usage

	var downcache = require("downcache");

	downcache("http://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=Jimmy%20Rollins&rvprop=content&format=json", function(err, resp, body) {
		// do something with the HTML body response
	});

If you request this page sometime later, you will see that the response returns MUCH fast. That's because the response is loading from your hard drive, not the Internet.

#Callbacks

The only required input to ```downcache``` is a url. Most of the time, you'll want to pass a callback function as well. This receives three variables: An error (hopefully null), a response object that is either the response provided by ```request``` or an object indicating that the page was loaded from cache, and the body of the page requested. Do with them what you will (or not).

	downcache("http://time.com/7612/americas-mood-map-an-interactive-guide-to-the-united-states-of-attitude/", function(err, resp, body) {
		if (err) throw err;
		if (resp.socket) {
			console.log(resp.socket.bytesRead);
		} else {
			console.log(resp);
		}
	});

Any error from the request, file retrieval or file writing is elevated to the callback.

#Caching

By default, this module creates a ```cache``` directory in the current directory. The path to the cached file is created from the url so that the local file structure resembles the website being crawled. 

#Options

To specify options, pass a third argument to ```downcache``` between the url and the callback. Here are your choices:

	-```dir```: The cache directory. Default is "cache"
	-```path```: The filepath to write the url response to. Default is the url itself as a file structure
	-```force```: Don't bother looking for the file in cache and call it live
	-```nocache```: Don't write the response to cache. Then question why you are using this module.
	-```json```: Run ```JSON.parse``` on the response

Note: The default behavior for "path" is similar to the structure created by `wget`, in which the directory structure of the website is replicated on disk. At some future point, I may make this identical so that one can "precache" a site by mirroring it and then use this module to make requests to it, falling back on the live site.

The most common case for specifying your own path is if the site that you're requesting attaches session keys to the links in the source code, as many government database search results have the awful habit of doing. If you don't specify a path without these keys, they will fool the module into requesting a new URL each time.

#To Do
	-Allow for optional "should I cache?" logic so as to ignore certain types of responses you don't want (say, those that are under 1KB, indicating an error)
	-Allow for cache expiration
	-Return a better response when called from cache

#Changes
**v0.0.5a**
Does not cache responses that have a status code other than 200.

**v0.0.4**
Checks to see if cached version is empty, and calls live if so.

**v0.0.3**
+Changed order of arguments passed to callback from `(err, body, resp)` to `(err, resp, body)` to match the [request module](https://github.com/mikeal/request).

#License
[MIT](/LICENSE.md)