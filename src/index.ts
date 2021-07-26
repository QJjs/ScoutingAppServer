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
	'.xml': 'text/xml',
	'.txt': 'text/plain',
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

	request.url = request.url.replace(/%20/g, " ")
	if(request.method == "DELETE") {
		if (!request.url.startsWith("/forms")) {
			response.writeHead(403)
			response.end()
			return
		} else {
			response.writeHead(404, {"Content-Type": mimeTypes[".txt"] })
			response.end("deletion successful")
		}
	}

	if (request.method == "POST") {
		console.log(request.headers)
		if (request.headers.date == null) {
			response.writeHead(418, {"Content-Type": mimeTypes[".txt"]})
			response.end("You may not brew coffee with a teapot")
		}
		request.on("data", chunk => {
			fs.writeFileSync("forms/" + request.headers.date, chunk)
		})
		response.writeHead(404, { "Content-Type": mimeTypes[".txt"] })
		response.end("received")
		return
	}

	if (request.url.startsWith("/api")) {
		apiHandler(request, response)
		return
	} else if (request.url.startsWith("/templates")) {
		request.url = "." + request.url
		if (!fs.existsSync(request.url)) {
			response.writeHead(404, { "Content-Type": mimeTypes[".txt"] })
			response.end("Template not found")
		} else {
			response.writeHead(200, { "Content-Type": mimeTypes[".json"] })
			response.end(fs.readFileSync(request.url))
		}
		return
	}

	var filePath = "./website" + request.url;
	if (filePath.endsWith("/")) {
		filePath += 'index.html';
	}

	fs.readFile(filePath, (error, data) => {
		if (error) {
			if(error.code == "ENOENT") {
				response.writeHead(301,{ "Location": `http://${request.headers.host}/`});
				response.end();
			} else {
				response.writeHead(500, { "Content-Type": mimeTypes[".html"] })
				response.end(`<h1>Error: <code>${error.message}</code></h1>`, "utf-8")
			}
		} else {
			response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
			response.end(data, "utf-8");
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
		return
	} else if (/\/api\/table\/[\w -.]/g.test(request.url)) {
		response.writeHead(200, { "Content-Type": mimeTypes[".txt"] })
		response.end(generateTable(path.parse(request.url).base), "utf-8")
		return
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
			if (path.extname(f) != ".json") {
				continue
			}
			var jsonData = JSON.parse(fs.readFileSync("forms/" + f).toString())
			data.push({
				"file": f,
				"template": jsonData["template"],
				"author": jsonData["scout_name"],
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

function generateTable(template: string): string {
	var templateData = JSON.parse(fs.readFileSync("templates/" + template).toString())
	var tabs = Object.keys(templateData)
	tabs.splice(tabs.indexOf("title"), 1)
	var keys = Array<string>()
	var response = "<thead>"
	tabs.forEach(value => {
		var components = templateData[value] as Array<object>
		components.forEach(value => {
			if (value["id"] != null) {
				keys.push(value["id"])
				response += `<th>${value["id"]}</th>`
			}
		})
	})
	response += "</thead>"
	for (var f of fs.readdirSync("forms")) {
		if (path.extname(f) != ".json") {
			continue
		}
		var formData = JSON.parse(fs.readFileSync("forms/" + f).toString())
		if (formData["template"] != template) continue
		response += "<tr>"
		keys.forEach(value => {
			if (formData[value] != null) {
				response += `<td>${formData[value]}</td>`
			} else {
				response += "<td>-</td>"
			}
		})
		response += "</tr>"
	}

	return response
}