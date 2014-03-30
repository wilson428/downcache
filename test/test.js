#!/usr/bin/env node

var downcache = require("downcache"),
	log = require("npmlog");

log.level = "verbose";

downcache("http://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=Jimmy%20Rollins&rvprop=content&format=json");

downcache("http://time.com/selfies-cities-world-rankings/", function(err, html) {
	console.log("Downloaded", html.length, "characters");
});

downcache("http://time.com/27821/us-college-rankings/", {
	path: "great-articles/rankings.html"
}, function(err, html, resp) {
	if (resp.socket) {
		console.log(resp.socket.bytesRead);
	}
	
	// try again, see it load from cache
	downcache("http://time.com/27821/us-college-rankings/", {
		path: "great-articles/rankings.html"
	}, function(err, html, resp) {
		console.log(resp);
	});	
});