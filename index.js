var request = require('request'),
	fs = require('graceful-fs'),
	path = require('path'),
	urlparse = require('url'),
	mkdirp = require('mkdirp'),
	log = require('npmlog');

/* OPTIONS */
/*
dir: directory where cache will be stored
path: path where cache is stored
force: Ignore presence of cache and call live
nocache: Don't cache the raw response. Then question why you are using this module.
*/

module.exports = function(url, opts, callback) {
	if (arguments.length === 1) {
		opts = {};
	} else if (arguments.length === 2 && typeof opts === "function") {
		callback = opts;
		opts = {};
	}

	if (!callback) {
		log.verbose("FYI, no callback provided.");
		callback = function() {};
	}

	// directory where the cache will be stored
	if (!opts.dir) {
		opts.dir = "./cache/";
	}
	
	log.verbose("directory for cache is", opts.dir);

	opts.url = url;

	// you can provide your own path for the cached file if you like
	// otherwise we will recreate the URL's path after the \.[a-z]+
	if (!opts.path) {
		opts.path = url_to_path(opts.url);
	}

	opts.path = path.join(opts.dir, opts.path);

	log.verbose("page will be written to", opts.path);

	retrieve(opts, callback);
}

var url_to_path = module.exports.url_to_path = function(url) {
	var p = path.join(urlparse.parse(url).hostname, urlparse.parse(url).path);
	// exorcise any trailing "/"
	return path.join(path.dirname(p), path.basename(p));
};

// check if the file is in cache
var retrieve = module.exports.retrieve = function(opts, callback) {
	if (opts.force) {
		download(opts, callback);
		return;
	}

	// look for the file in cache. Otherwise call live.
	fs.readFile(opts.path, { encoding: "utf-8" }, function(err, body) {
		if (err) {
			log.verbose("Couldn't find " + opts.url + " in cache. (Looked for it at " + opts.path + ".) Calling live.");
			download(opts, callback);
		} else if (body.length === 0) {
			log.verbose("Found an empty file in the cache for " + opts.url + ". Calling live.");
			download(opts, callback);
		} else {
			log.verbose("loaded " + opts.url + " from cache at " + opts.path);
			toCallback(opts, { status: "retrieved from cache", path: opts.path, url: opts.url }, body, callback);
		}
	});
};

var download = module.exports.download = function(opts, callback) {
	request(opts.url, function(err, resp, body) {
		if (err) {
			log.error("Error retrieving", opts.url, ":", err);
			return callback(err, null, null);
		};

		// make sure it's a valid response
		if (resp.statusCode != 200) {
			log.info("Did not cache", opts.url, "because response code was", resp.statusCode);
			return callback("Bad response code", resp, body);
		}

		var response = {
			response: resp,
			url: opts.url
		}

		// store in local cache
		mkdirp(path.dirname(opts.path), function (err) {
		    if (err) {
		    	response.status = "error";
		    	return callback(err, response, body);
		    }

			fs.writeFile(opts.path, body, function(err) {
				if (err) {
			    	response.status = "error";
			    	return callback(err, response, body);
				}
				log.verbose("Cached at " + opts.path);
		    	response.status = "retrieved live and cached";
		    	response.path = opts.path;
				toCallback(opts, response, body, callback);
			});
		});
	});	
};

var toCallback = function(opts, resp, body, callback) {
	if (opts.json) {
		try {
			body = JSON.parse(body);
		} catch(e) {
			log.error("Couldn't parse response as JSON. Returning as string");
			callback(e, resp, body);
			return;
		}
	}
	callback(null, resp, body);
}