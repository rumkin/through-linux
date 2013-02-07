/*/// --------------------------------------------------------------------------
	DEPENDENCIES
/*/// --------------------------------------------------------------------------

var http  = require("http")
	, spawn = require("child_process").spawn
	, url   = require("url")
	, fs    = require("fs")
	, path  = require("path")

/*/// --------------------------------------------------------------------------
	CGI Server
/*/// --------------------------------------------------------------------------

http.createServer(function(req, res){
	var query = url.parse(req.url, true)

	req.uri   = query.pathname
	req.query = query.query

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

	// Create process environment with CGI variables
	var env = extend({}, process.env, {
		GATEWAY_INTERFACE : 'CGI/1.1',
    SCRIPT_FILENAME   : pathname,
    DOCUMENT_ROOT     : process.env.PWD,
    SERVER_NAME       : 'localhost',
    SERVER_PORT       : 8090,
    SERVER_PROTOCOL   : 'HTTP/1.1',
    SERVER_SOFTWARE   : 'node/' + process.version,
    REDIRECT_STATUS   : 1,
		REQUEST_METHOD    : req.method,
		QUERY_STRING      : query.search
	})

	// Add HTTP headers to environment prefixed with 'HTTP_'
	for (var header in req.headers) {
		var name = 'HTTP_' + header.toUpperCase().replace(/-/g, '_')
		env[name] = req.headers[header]
	}
	
	// Add special environment variables to process incoming data	
	if ('content-length' in req.headers) {
		env.CONTENT_LENGTH = req.headers['content-length']
	}

	if ('content-type' in req.headers) {
		env.CONTENT_TYPE = req.headers['content-type']
	}

	var  cgi = spawn('php-cgi', ["-c", "/etc/php.ini"], { env : env });

	if (req.method != 'GET') {
		// Redirect HTTP request body to cgi input
		req.pipe(cgi.stdin)
	}
	
	// PROCESS CGI RESPONSE -----------------------------------------------------
	
	var headers = false

	var buff    = new Buffer('', 'utf-8')
		, headers = false

	cgi.stdout.on('data', function (data) {
		if ( ! headers) {
			header = true

			var data = data.toString('utf-8')
			
			// Parse headers
			while (true) {
				var crlfPos = data.indexOf("\r\n")

				if ( crlfPos < 0) break;

				var header = data.substr(0, crlfPos);
				if ( ! header.length) break;

				header = header.split(/:\s*/, 2)
				if (header.length !== 2) break;
				
				data = data.substr(crlfPos + 2)

				var name  = header[0]
					, value = header[1]

				if (name == 'Status') {
					res.statusCode = parseInt(value, 10) || 0
				} else {
					res.setHeader(name, value)
				}

			}

			res.write(buff.toString('utf-8'))
			res.write(data)
			buff = new Buffer('')
		} else {
			res.write(buff.toString('utf-8'))
			res.write(data)
		}
	});

	cgi.stderr.on('data', function (data) {
		// Prevent output before headers are sent. Use buffering to collect output
		if ( ! headers) {
		  buff = Buffer.concat([buff, data], buff.length + data.length)
		} else {
			res.write(data)
		}
	});

	cgi.on('exit', function (code) {
	  res.end();
	});

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