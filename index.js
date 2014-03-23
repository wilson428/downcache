// Download a webpage and cache it locally for future retrieval
// modeled after the github.com/UnitedStates utils.py download function

var request = require('request'),
	fs = require('fs'),
	path = require('path'),
	urlparse = require('url'),
	mkdirp = require('mkdirp'),
	log = require('npmlog');

//process.setMaxListeners(20);

// try to find a page in cache. If not found, retrieve and cache

/* OPTIONS */
/*
force: Ignore presence of cache and call live
nocache: Don't cache the raw response. Then question why you are using this module.
*/

module.exports = function(url, opts, callback) {
	if (arguments.length < 3) {
		callback = opts;
		opts = {};
	}

	callback = callback || function() {};

	// directory where the cache will be stored
	if (!opts.dir) {
		opts.dir = "./cache/";
	}
	log.verbose("directory for cache is", opts.dir);

	opts.url = url;

	// you can provide your own path for the cached file if you like
	// otherwise we will recreate the URL's path after the \.[a-z]+
	if (!opts.path) {
		opts.path = path.join(urlparse.parse(opts.url).hostname, urlparse.parse(opts.url).path);
	}

	opts.path = path.join(opts.dir, opts.path);

	// exorcise any trailing "/"
	opts.path = path.join(path.dirname(opts.path), path.basename(opts.path));

	log.verbose("page will be written to", opts.path);

	retrieve(opts, callback);
}

// check if the file is in cache
var retrieve = module.exports.retrieve = function(opts, callback) {
	if (opts.force) {
		download(opts, callback);
		return;
	}

	fs.readFile(opts.path, { encoding: "utf-8" }, function(err, body) {
		if (err) {
			log.info("Couldn't find " + opts.url + " in cache. Calling live.");
			download(opts, callback);
		} else {
			log.verbose("loaded " + opts.url + " from cache at " + opts.path);
			if (opts.json) {
				body = JSON.parse(body);
			}
			callback(body, opts);
		}
	});
}

var download = module.exports.download = function(opts, callback) {
	console.log(path.basename(opts.path));

	request(opts.url, function(err, resp, body) {
		if (err) {
			log.error("Error retrieving", opts.url);
			return null;
		};

		mkdirp(path.dirname(opts.path), function (err) {
		    if (err) throw err;
			fs.writeFile(opts.path, body, function(err) {
				if (err) throw err;
				log.verbose("Cached in " + opts.path);

				if (opts.json) {
					body = JSON.parse(body);
				}
				callback(body, opts);
			});
		});
	});	
}