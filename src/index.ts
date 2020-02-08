import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'

const options = {
	// "key": fs.readFileSync("key.pem"),
	// "cert": fs.readFileSync("cert.pem")
}

const mimeTypes = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.wav': 'audio/wav',
	'.mp4': 'video/mp4',
	'.woff': 'application/font-woff',
	'.ttf': 'application/font-ttf',
	'.eot': 'application/vnd.ms-fontobject',
	'.otf': 'application/font-otf',
	'.wasm': 'application/wasm'
};

http.createServer(options, (request: http.IncomingMessage, response: http.ServerResponse) => {
	if (request.method == "POST") {
		console.log(request.headers)
		request.on("data", chunk => {
			fs.writeFileSync("forms/" + request.headers.date, chunk)
		})
		response.writeHead(404, { "Content-Type": "text/plain" })
		response.end("recieved")
		return
	}

	if (request.url.startsWith("/api")) {
		apiHandler(request, response)
		return
	} else if (request.url.startsWith("/templates")) {
		request.url = "." + request.url
		if (!fs.existsSync(request.url)) {
			response.writeHead(404, { "Content-Type": "text/plain" })
			response.end("Template not found")
		} else {
			response.writeHead(200, { "Content-Type": mimeTypes[".json"] })
			response.end(fs.readFileSync(request.url))
		}
		return
	}

	var filePath = './website' + request.url;
	if (filePath.endsWith("/")) {
		filePath += 'index.html';
	}

	fs.readFile(filePath, (error, data) => {
		if (error) {
			if(error.code == 'ENOENT') {
				fs.readFile('./404.html', function(error, data) {
					response.writeHead(404, { 'Content-Type': mimeTypes[".html"] });
					response.end(data);
				});
			} else {
				response.writeHead(404, { "Content-Type": mimeTypes[".html"] })
				response.end("Unknown Error")
			}
		} else {
			response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || "application/octet-stream" });
			response.end(data, 'utf-8');
		}
	})
}).listen(80)

function apiHandler(request: http.IncomingMessage, response: http.ServerResponse) {
	if (/\/api\/templates\/[\w -.]/g.test(request.url)) {
		response.writeHead(200, { "Content-Type": mimeTypes[".json"] })
		response.end(fs.readFileSync("./templates/" + path.parse(request.url).base))
		return
	} else if (/\/api\/forms\/[\w -.]/g.test(request.url)) {
		response.writeHead(200, { "Content-Type": mimeTypes[".json"] })
		response.end(fs.readFileSync("./forms/" + path.parse(request.url).base))
	}

	switch (request.url) {
	case "/api/templates":
		response.writeHead(200, { "Content-Type": mimeTypes[".json"] })
		var files = fs.readdirSync("templates")
		var data = Array<object>()
		for (var f of files) {
			var jsonData = JSON.parse(fs.readFileSync("templates/" + f).toString())
			data.push({
				"file": f,
				"title": jsonData["title"]
			})
		}
		response.end(JSON.stringify({ "files": data }))
	case "/api/forms":
		response.writeHead(200, { "Content-Type": mimeTypes[".json"] })
		var files = fs.readdirSync("forms")
		var data = Array<object>()
		for (var f of files) {
			var jsonData = JSON.parse(fs.readFileSync("forms/" + f).toString())
			data.push({
				"file": f,
				"template": jsonData["template"],
				"author": jsonData["author"],
				"size": readableFileSize(fs.statSync("forms/" + f).size)
			})
		}
		response.end(JSON.stringify({ "files": data }))
	}
}

function readableFileSize(size: number): string {
	if (size <= 0) return "0"
	const units = ["B", "KB", "MB", "GB", "TB"]
	var digitGroup = Math.floor(Math.log(size) / Math.log(1024))
	return Number((size / Math.pow(1024, digitGroup)).toFixed(2)) + " " + units[digitGroup]
}