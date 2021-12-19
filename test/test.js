#!/usr/bin/env node

import { Downcache, SetProperty } from "../index.js";
import { strict as assert } from 'assert';
import rimraf from "rimraf";

SetProperty({
	log: "verbose",
	limit: 2000
});

//assert.equal(Downcache.url_to_path("http://example.com", {}), "example.com/index.html");

// remove old cache from previous tests
rimraf("./cache", function(err) {
	// see what happens when we get a status code other than 200
	Downcache("http://api.meetup.com/2/members?group_id=741891&key=dsafsadfsadfasf", function(err, resp, html) {
		console.log(err);
	});

	Downcache("http://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=Jimmy%20Rollins&rvprop=content&format=json", function(err, resp, html) {
		//console.log(resp);
		//console.log(Object.keys(resp.response));
		console.log(resp.type, resp.sub_type);
	});

	Downcache("http://www.imdb.com", function(err, resp, html) {
		Downcache("http://www.imdb.com/title/tt0068646/", function(err, resp, html) {
			console.log("Downloaded", html.length, "characters from", resp.url);
			Downcache("http://www.imdb.com/title/tt0068646/fullcredits", function(err, resp, html) {
				console.log("Downloaded", html.length, "characters from", resp.url);
			});
		});
	});

	Downcache("http://time.com/67280/mean-girls-mythology/", {
		path: "great-articles/meangirls.html",
		log: "verbose" // will override just for this call
	}, function(err, resp, html) {
		if (resp.socket) {
			console.log(resp.socket.bytesRead);
		}
		
		// try again, see it load from cache
		Downcache("http://time.com/67280/mean-girls-mythology/", {
			path: "great-articles/meangirls.html",
			log: "verbose"
		}, function(err, resp, html) {
			//console.log(resp);
		});	
	});

	// testing POST 
	Downcache("https://statements.mevaker.gov.il/Handler/GuarantyDonationPublisherHandler.ashx", {
		post: {
			action: "gcbp",
			p: 3
		}
	}, function(err, resp, html) {
		//console.log(resp);
	});
	/*
	// still working on this
	Downcache("http://mlb.mlb.com/images/players/mugshot/ph_424324.jpg", function(err, resp, body) {
		console.log(resp.type, resp.sub_type);
	});
	*/
});
