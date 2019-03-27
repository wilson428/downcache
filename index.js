const fs = require('graceful-fs');
const path = require('path');
const querystring = require("querystring");
const request = require('request');
const urlparse = require('url');
const mkdirp = require('mkdirp');
const log = require('npmlog');

const RateLimiter = require('limiter').RateLimiter;

/* OPTIONS */
/*
dir: directory where cache will be stored
path: path where cache is stored
force: Ignore presence of cache and call live
nocache: Don't cache the raw response. Then question why you are using this module.
header: headers to pass to request()
json: run JSON.parse on the result
log: npmlog level
limit: time in ms between calls
noindex: Don't add /index.html to paths when appropriate
post: POST request
*/

// initial options, which we can overwrite any time
let global_options = {
	dir: "./cache",
	limit: 500,
	log: "warn",
	encoding: "utf-8",
	force: false,
	json: false,
	noindex: false,
	post: null
};

let global_headers = {
	gzip: true
};

let limiter = new RateLimiter(1, global_options.limit);

// downcache({ url: "http://example.com" })
// downcache("http://example.com/data.json", { json: true }, function(err, resp, body) {} )
// downcache("http://example.com", function(err, resp, body) {} )

// we want to be flexible with the order of arguments since there are only three feasible types
module.exports = function() {
	// defaults
	let opts = Object.assign({}, global_options);

	// this doesn't currently fire.
	let callback = function(err, resp, body) {
		log.info("This is the default downcache callback since you didn't provide one.");
		if (err) { log.error(err); return; }
		log.info("Response code:", resp.statusCode);
	};

	Object.values(arguments).forEach(arg => {
		if (typeof arg === "string") {
			opts.url = arg;
		}

		if (typeof arg === "object") {
			opts = Object.assign(opts, arg);
		}

		if (typeof arg === "function") {
			callback = arg;
		}
	});

	opts.headers = Object.assign(opts.headers || {}, global_headers);

	log.level = opts.log;

	// copy `url` and `encoding` to the headers object
	if (!opts.headers.url) {
		opts.headers.url = opts.url || opts.uri;
	}

	if (!opts.headers.encoding) {
		opts.headers.encoding = opts.encoding;
	}

	log.verbose("directory for cache is", opts.dir);

	// you can provide your own path for the cached file if you like
	// otherwise we will recreate the URL's path in the cache directory
	if (!opts.path) {
		opts.path = url_to_path(opts.headers.url, opts);
	}

	opts.path = path.join(opts.dir, opts.path);

	log.verbose("The cache path for " + opts.headers.url + " is " + opts.path);

	retrieve(opts, callback);
}

// create a filepath out of url, same as wget
let url_to_path = module.exports.url_to_path = function(url, opts) {
	let parsedUrl = urlparse.parse(url);
	let p = path.join(parsedUrl.hostname, parsedUrl.path);
	// exorcise any trailing "/"
	p = path.join(path.dirname(p), path.basename(p));

	if (parsedUrl.path.length <= 1 || (!opts.noindex && path.extname(p) === "" && !parsedUrl.query)) {
		log.verbose("Resolving", p, "to", p + "/index.html.");
		p += "/index.html";
	} else if (opts.noindex) {
		log.verbose("Not resolving", p, "to", p + "/index.html since you told me not to.");		
	}

	if (opts.post) {
		p += "?" + querystring.stringify(opts.post);
	}
	return p;
};

// check if the file is in cache
let retrieve = module.exports.retrieve = function(opts, callback) {
	if (opts.force) {
		download(opts, callback);
		return;
	}

	// look for the file in cache. Otherwise call live.
	fs.readFile(opts.path, { encoding: opts.encoding }, function(err, body) {
		if (err) {
			log.verbose("Couldn't find " + opts.headers.url + " in cache. (Looked for it at " + opts.path + ".) Calling live.");
			queueDownload(opts, callback);
		} else if (body.length === 0) {
			log.verbose("Found an empty file in the cache for " + opts.headers.url + ". Calling live.");
			queueDownload(opts, callback);
		} else {
			log.verbose("loaded " + opts.headers.url + " from cache at " + opts.path);

			// we want to return an object as similar as possible to that which would have be retrieved live
			let stats = fs.statSync(opts.path);
			toCallback(opts, 
				{
					statusCode: "200",
					statusMessage: "retrieved from cache",
					path: opts.path,
					url: opts.headers.url,
					modified: stats.mtime
				},
				body, callback
			);
		}
	});
};

let queueDownload = function(opts, callback) {
	limiter.removeTokens(1, function(err, remainingRequests) {
		if (err) {
			log.info("rate limited " + opts.url);
			return callback("rate limited");
		}
		download(opts, callback);
	});
}

let download = function(opts, callback) {
	function requestCallback(err, resp, body) {
		if (err) {
			log.error("Error retrieving", opts.headers.url, ":", err);
			log.error(err, resp, body);
			return callback(err, null, null);
		};

		// make sure it's a valid response
		if (resp.statusCode != 200) {
			log.error("Did not cache", opts.headers.url, "because response code was", resp.statusCode);
			return callback("Bad response code", resp, body);
		}

		// we may want to change behavior based on the content type
		let content_type = resp.headers['content-type'].toLowerCase().split("; ")[0],
			type = content_type.split("/")[0],
			sub_type = content_type.split("/")[1];

		/*
		// to-do: handle images

		if (typeof opts.json === "undefined" && sub_type === "json") {
			log.verbose("Guessing that " + opts.headers.url, + " is a JSON document based on HTTP response. Override with { json: false }");
			opts.json = true;
		}

		if (typeof opts.image === "undefined" && type === "image") {
			log.verbose("Guessing that " + opts.headers.url, + " is an image based on HTTP response. Override with { image: false }")
			opts.image = true;
		}
		*/

		let response = {
			response: resp,
			url: opts.headers.url,
			type: type,
			sub_type: sub_type
		}

		// store in local cache
		mkdirp(path.dirname(opts.path), function (err) {
		    if (err) {
		    	response.status = "error";
		    	log.warn("Downcache wasn't able to make a directory at", opts.path + ". This is probably because there's a file in the way. This can happen if `noindex` is set to true in the options.");
		    	return callback(err, response, body);
		    }

			fs.writeFile(opts.path, body, function(err) {
				if (err) {
					log.error(err);
			    	response.status = "error";
			    	return callback(err, response, body);
				}
				log.verbose("Cached " + opts.headers.url + " at " + opts.path);
		    	response.status = "retrieved live and cached";
		    	response.path = opts.path;
				toCallback(opts, response, body, callback);
			});

		    /*
			if (opts.image) {
				var ws = fs.createWriteStream(opts.path);
				ws.on('finish', function() {
					console.log('image done');
					console.log(resp.socket.bytesRead);
					//ws.end();
				});
				//ws.write(new Buffer(body));
				ws.write(body);
				ws.end();

				console.log(Object.keys(resp));
				fs.writeFile(opts.path, body, "binary", function(err) {
					console.log("done");
				});
				/*

				//http://stackoverflow.com/a/20490629/1779735
				fs.writeFile(opts.path, body, 'binary', function(err) {
					if (err) {
				    	response.status = "error";
				    	return callback(err, response, body);
					}
					log.verbose("Cached image at " + opts.path);
			    	response.status = "retrieved image live and cached";
			    	response.path = opts.path;
					toCallback(opts, response, body, callback);
				}); 
			} else {
			*/
		});
	}

	if (opts.post) {
		log.info("POST");
		opts.headers.form = opts.post;
		// opts.headers.gzip = false;

		request.post(opts.headers, requestCallback);
	} else {
		// opts.headers.gzip = false;
		request.get(opts.headers, requestCallback);
	}
};

let download_image = function(uri, filename, callback){
	limiter.removeTokens(1, function() {
		request.head(uri, function(err, res, body){
	    	if (parseInt(res.headers['content-length'], 10) < 10) {
		    	log.error("Encountered too few bytes when attempting to download ", uri);
		    	callback(null);
	    	} else {
			    request({
			    	uri: uri,
			    	gzip: true
			    }).pipe(fs.createWriteStream(filename)).on('close', callback);
	    	}
	  });
	});
};

let toCallback = function(opts, resp, body, callback) {
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

// update the global settings that get used in absense of a specification in the individual call
module.exports.set = function(property, value) {
	if (typeof property == "string" && typeof value == "string") {
		global_options[property] = value;
	} else if (typeof property == "object") {
		global_options = Object.assign(property, global_options);
	}
	if (property == "limit" || property.limit) {
		limiter = new RateLimiter(1, global_options.limit);
	}
}
