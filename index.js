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
	opts = opts || {};

	// if two arguments, assume second is a callback
	if (arguments.length < 3 && typeof opts === "function") {
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
	//log.verbose("directory for cache is", opts.dir);

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
		} else {
			log.verbose("loaded " + opts.url + " from cache at " + opts.path);

			if (opts.json) {
				body = JSON.parse(body);
			}

			callback(null, body, { status: "from_cache" });
		}
	});
};

var download = module.exports.download = function(opts, callback) {
	request(opts.url, function(err, resp, body) {
		if (err) {
			log.error("Error retrieving", opts.url);
			return callback(err, body, resp);
		};

		// store in local cache
		mkdirp(path.dirname(opts.path), function (err) {
		    if (err) {
		    	return callback(err, body, resp);
		    }

			fs.writeFile(opts.path, body, function(err) {
				if (err) {
			    	return callback(err, body, resp);
				}
				log.verbose("Cached at " + opts.path);

				if (opts.json) {
					body = JSON.parse(body);
				}

				callback(null, body, resp);
			});
		});
	});	
};