const fs = require('graceful-fs');
const path = require('path');
const querystring = require("querystring");
const fetch = require('node-fetch');
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

let limiter, opts, queueDownload;

// create a filepath out of url, same as wget
const url_to_path = module.exports.url_to_path = function(url, opts) {
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


// downcache({ url: "http://example.com" })
// downcache("http://example.com/data.json", { json: true }, function(err, resp, body) {} )
// downcache("http://example.com", function(err, resp, body) {} )

// we want to be flexible with the order of arguments since there are only three feasible types
module.exports = function() {
	// this doesn't currently fire.
	let callback = function(err, resp, body) {
		log.info("This is the default downcache callback since you didn't provide one.");
		if (err) { log.error(err); return; }
		log.info("Response code:", resp.statusCode);
	};

	// initial options, which we can overwrite any time
	const default_options = {
		dir: "./cache",
		limit: 500,
		log: "warn",
		encoding: "utf-8",
		force: false,
		json: false,
		noindex: false,
		post: null
	};

	const default_headers = {
		'Accept-Encoding': 'gzip, deflate, br'
	};

	opts = {};

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

	opts = Object.assign(default_options, opts);

	let headers = Object.assign(default_headers, opts.headers || {});

	opts.headers = headers;

	log.level = opts.log;

	limiter = new RateLimiter(1, opts.limit);

	queueDownload = function(opts, callback) {
		limiter.removeTokens(1, function(err, remainingRequests) {
			if (err) {
				log.info("rate limited " + opts.url);
				return callback("rate limited");
			}
			download(opts, callback);
		});
	}

	// copy `url` and `encoding` to the headers object
	// if (!opts.url) {
	// 	opts.url = opts.url || opts.uri;
	// }

	// if (!opts.headers.encoding) {
	// 	opts.headers.encoding = opts.encoding;
	// }

	log.verbose("directory for cache is", opts.dir);

	// you can provide your own path for the cached file if you like
	// otherwise we will recreate the URL's path in the cache directory
	if (!opts.path) {
		opts.path = url_to_path(opts.url, opts);
	}

	opts.path = path.join(opts.dir, opts.path);

	log.verbose("The cache path for " + opts.url + " is " + opts.path);

	retrieve(opts, callback);
}


let fireCallback = function(opts, err, resp, body, callback) {
	if (opts.json) {
		try {
			body = JSON.parse(body);
		} catch(e) {
			log.error("Couldn't parse response as JSON. Returning as string");
			callback(e, resp, body);
			return;
		}
	}
	callback(err, resp, body);
}

// check if the file is in cache
let retrieve = module.exports.retrieve = function(opts, callback) {
	if (opts.force) {
		queueDownload(opts, callback);
		return;
	}

	// look for the file in cache. Otherwise call live.
	fs.readFile(opts.path, { encoding: opts.encoding }, function(err, body) {
		if (err) {
			log.verbose("Couldn't find " + opts.url + " in cache. (Looked for it at " + opts.path + ".) Calling live.");
			queueDownload(opts, callback);
		} else if (body.length === 0) {
			log.verbose("Found an empty file in the cache for " + opts.url + ". Calling live.");
			queueDownload(opts, callback);
		} else {
			log.verbose("loaded " + opts.url + " from cache at " + opts.path);

			// we want to return an object as similar as possible to that which would have be retrieved live
			let stats = fs.statSync(opts.path);
			fireCallback(opts, 
				null, // err
				{
					statusCode: "200",
					statusMessage: "retrieved from cache",
					path: opts.path,
					url: opts.url,
					modified: stats.mtime
				}, // resp
				body, callback
			);
		}
	});
};

function download(opts, callback) {
	let resp;

	if (opts.post) {
		log.info("POST");
		// opts.headers.gzip = false;

		opts.post.method = "POST";

		return fetch(opts.url, opts.post)
			.then(res => {
				resp = res;
				return res.text();
			})
			.then(body => {
				savePage(opts, resp, body);
				fireCallback(opts, null, resp, body, callback);
			})
			.catch(err => {
				console.error('fetch failed', err);
				fireCallback(opts, err, resp, null, callback);				
			});
	} else {
		return fetch(opts.url)
			.then(res => {
				resp = res;
				return res.text();
			})
			.then(body => {
				savePage(opts, resp, body);
				fireCallback(opts, null, resp, body, callback);
			})
			.catch(err => {
				console.error('fetch failed', err);
				fireCallback(opts, err, resp, null, callback);				
			});
	}
}

// call the page live, store it, and send to callback 
function savePage(opts, resp, body) {
	// store in local cache
	mkdirp(path.dirname(opts.path)).then(made => {
		fs.writeFile(opts.path, body, function(err) {
			if (err) {
				log.error(err);
		    	log.warn("Downcache wasn't able to write a file at", opts.path + ". This is probably because there's a file in the way. This can happen if `noindex` is set to true in the options.");
				return;				
			}
			log.verbose("Cached " + opts.url + " at " + opts.path);
		});
	}).catch(err => {
		log.error(err);
    	log.warn("Downcache wasn't able to create directory at", path.dirname(opts.path) + ". This is probably because the path is invalid based on the `dir` argument.");
	});
} // savePage

// update the global settings that get used in absense of a specification in the individual call
module.exports.set = function(property, value) {
	if (typeof property == "string" && typeof value == "string") {
		opts[property] = value;
	} else if (typeof property == "object") {
		opts = Object.assign(property, opts);
	}
	if (property == "limit" || property.limit) {
		limiter = new RateLimiter(1, opts.limit);
	}
}
