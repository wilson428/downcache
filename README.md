downcache
=========

Downcache is a Node.js module for downloading and caching webpages for fast future retrieval. It is modeled on the [download function](https://github.com/unitedstates/congress/blob/master/tasks/utils.py) we use at the [UnitedStates](https://github.com/unitedstates) project.

Any sort of application or project that involves live calls to webpages often ends up hitting them far more often than is reasonably necessary. This module functions like @mikeal's [request](https://github.com/mikeal/request)--in fact, it uses it as a dependency--but stores a copy of the HTML response on your local machine. The next time you make a request to that page using downcache, it checks for that local copy before making another call to the live page.

#Installation

```npm install https://github.com/wilson428/downcache.git``` (local)

```sudo npm install -g https://github.com/wilson428/downcache.git``` (global)

#Usage

	var downcache = require("downcache");

	downcache("http://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=Jimmy%20Rollins&rvprop=content&format=json", function(err, body) {
		// do something with the HTML body response
	});

#Callbacks

The only required input to ```downcache``` is a url. Most of the time, you'll want to pass a callback function as well. This receives three variables: An error (hopefully null), the body of the page requested, and a response object that is either the response provided by ```request``` or an object indicating that the page was loaded from cache. Do with them what you will (or not).

	downcache("http://time.com/7612/americas-mood-map-an-interactive-guide-to-the-united-states-of-attitude/", function(err, body, resp) {
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
	-```path```: The filepath to write the url response to. Default is the url itself, minus the schema (http://)
	-```force```: Don't bother looking for the file in cache and call it live
	-```nocache```: Don't write the response to cache. Then question why you are using this module.
	-```json```: Run ```JSON.parse``` on the response

#To Do
	-Allow for cache expiration
	-Return a better response when called from cache