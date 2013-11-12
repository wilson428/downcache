// Download a webpage and cache it locally for future retrieval
// moduled after the Github.com/UnitedStates utils.py download function

var request = require('request'),
	fs = require('fs'),
	mkdirp = require('mkdirp');

var downcache = module.exports = exports;

var isVerbose = false;

// try to find a page in cache. If not found, retrieve and cache
module.exports = function(url, opts, callback) {
	if (arguments.length < 3) {
		callback = opts;
		opts = {};
	}

	if (!callback) {
		callback = function() {};
	}

	if (opts.dir) {
		if (opts.dir.slice(-1) != "/") {
			opts.dir += "/";
		}
	} else {
		opts.dir = "";
	}

	opts.dir += "cache/";

	announce("directory for cache is " + opts.dir)

	var dir = opts.dir + url.split("/").slice(2, -1).join("/"),
		path = opts.dir + url.split("/").slice(2).join("/");

	if (path === dir + "/") {
		path += "index.html";
	}

	fs.readFile(path, {encoding: "utf-8" }, function(err, body) {
		if (err) {
			announce("Couldn't find " + url + " in cache. Calling live.");
			request(url, function(err, resp, body) {
				if (err) {
					console.log("Error retrieving", url);
					return null;
				};

				mkdirp(dir, function (err) {
				    if (err) throw err;
					fs.writeFile(path, body, function(err) {
						if (err) throw err;
						announce("Cached;");

						if (opts.json) {
							body = JSON.parse(body);
						}
						callback(body);
					});
				});
			});
		} else {
			announce("loaded " + url + " from cache");
			if (opts.json) {
				body = JSON.parse(body);
			}
			callback(body);
		}
	});
}

module.exports.verbose = function() {
	isVerbose = true;
    return this;
};

function announce(message) {
	if (isVerbose) {
		console.log(message);
	}
}