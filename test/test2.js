import { Downcache } from '../index.js';

Downcache("https://electproject.github.io/Early-Vote-2020G/index.html", {
	dir: "my_cache",
	log: "verbose"
}, function(err, resp, body) {
	// console.log(resp);

});


Downcache("http://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=Jimmy%20Rollins&rvprop=content&format=json", { dir: "json", json: true }, function(err, resp, json) {
	console.log(json);
	console.log(typeof json);
});
