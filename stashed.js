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

// make sure it's a valid response
/*
if (resp.statusCode != 200) {
	log.error("Did not cache", opts.url, "because response code was", resp.statusCode);
	return callback("Bad response code", resp, body);
}
*/

// we may want to change behavior based on the content type
// const content_type = resp.headers['content-type'][0].toLowerCase().split("; ")[0];
// const type = content_type.split("/")[0];
// const sub_type = content_type.split("/")[1];

// let response = {
// 	response: resp,
// 	url: opts.url,
// 	type: type,
// 	sub_type: sub_type
// }



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
		fireCallback(opts, response, body, callback);
	}); 
} else {
*/


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
