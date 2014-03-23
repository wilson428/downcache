#!/usr/bin/env node

var downcache = require("downcache"),
	log = require("npmlog");

log.level = "verbose";

downcache("http://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=Jimmy%20Rollins&rvprop=content&format=json", function(html) {});

downcache("http://time.com/selfies-cities-world-rankings/", function(html) {
	console.log("Downloaded", html.length, "characters");
});

downcache("http://time.com/27821/us-college-rankings/", {
	path: "great-articles/rankings.html"
}, function(html) {

	// try again, see it load from cache
	downcache("http://time.com/27821/us-college-rankings/", {
		path: "great-articles/rankings.html"
	}, function(html) {});
	
});

