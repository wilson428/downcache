#!/usr/bin/env node

var downcache = require("../index"),
	log = require("npmlog");

log.level = "verbose";

downcache("http://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=Jimmy%20Rollins&rvprop=content&format=json");

downcache("http://time.com/selfies-cities-world-rankings/", function(err, resp, html) {
	console.log("Downloaded", html.length, "characters");
});

downcache("http://time.com/27821/us-college-rankings/", {
	path: "great-articles/rankings.html"
}, function(err, resp, html) {
	if (resp.socket) {
		console.log(resp.socket.bytesRead);
	}
	
	// try again, see it load from cache
	downcache("http://time.com/27821/us-college-rankings/", {
		path: "great-articles/rankings.html"
	}, function(err, resp, html) {
		console.log(resp);
	});	
});

// see what happens when we get a status code other than 200
downcache("http://api.meetup.com/2/members?group_id=741891&key=dsafsadfsadfasf", function(err, resp, html) {
	console.log(err);
});