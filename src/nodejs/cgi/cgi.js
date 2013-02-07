var http  = require("http")
	, spawn = require("child_process").spawn
	, url   = require("url")
	, fs    = require("fs")
	, path  = require("path")

http.createServer(function(req, res){
	var query = url.parse(req.url, true)

	req.uri   = query.pathname
	req.query = query.query

	//var env = extend({}, {
	var pathname = path.join(process.env.PWD, query.pathname)

	if ( ! fs.existsSync(pathname)) {
		return notFound(res)
	}

	if (fs.statSync(pathname).isDirectory()) {
		pathname = path.join(pathname, "index.php")
	}

	if ( ! fs.existsSync(pathname)) {
		return notFound(res)
	}

	var env = extend({}, process.env, {
		GATEWAY_INTERFACE : 'CGI/1.1',
	    SCRIPT_FILENAME   : pathname,
	    DOCUMENT_ROOT     : process.env.PWD,
	    SERVER_NAME       : 'localhost',
	    SERVER_PORT       : 8090,
	    SERVER_PROTOCOL   : 'HTTP/1.1',
	    SERVER_SOFTWARE   : 'node/' + process.version,
	    REDIRECT_STATUS   : 1
	})

	for (var header in req.headers) {
		var name = 'HTTP_' + header.toUpperCase().replace(/-/g, '_')
		env[name] = req.headers[header]
	}
	
	extend(env, {
		REQUEST_METHOD : req.method,
		QUERY_STRING   : query.search
	})

	if ('content-length' in req.headers) {
		env.CONTENT_LENGTH = req.headers['content-length']
	}

	if ('content-type' in req.headers) {
		env.CONTENT_TYPE = req.headers['content-type']
	}

	var  cgi = spawn('php-cgi', ["-c", "/etc/php.ini"], { env : env });

	if (req.method != 'GET') {
		req.pipe(cgi.stdin)
	}
	//process.stdin.pipe(cgi.stdin)
	
	var headers = false
	cgi.stdout.on('data', function (data) {

		data = data + ''
		if (! headers) {
		  while (! /^\r\n/.test(data)) {
		    var match = /^([A-z][-_A-z]*):\s(.*)\r\n/.exec(data)
		    if (match) {
		      res.setHeader(match[1], match[2])
		      data = data.substr(match[0].length)
		    }

		    if (!data.length) break;
		  }

		  if (data.length) headers = true
		}

	  res.write('' + data);
	});

	cgi.stderr.on('data', function (data) {
	  res.write('Error: ' + data);
	});

	cgi.on('exit', function (code) {
	  res.end();
	});

	//res.end(JSON.stringify(url.parse(req.url, true)))

}).listen(8090)

console.log("Listening 8090")


function extend() {

	if (arguments.length == 0) {
		return {}
	} else if (arguments.length == 1) {
		return arguments[0]
	}

	var target = arguments[0]

	for (var i = 1, l = arguments.length; l > i; i++) {
		var source = arguments[i]
		for (var prop in source) {
			target[prop] = source[prop]
		}
	}

	return target
}

function notFound(res) {
	res.writeHead(404, 'Not found', {'content-type' : 'text/plain'})
	res.end('File not found')
}