import * as http from 'http'
import * as fs from 'fs'

const options = {
	// "key": fs.readFileSync("key.pem"),
	// "cert": fs.readFileSync("cert.pem")
}

http.createServer(options, (request, response) => {
	if (request.method == "POST") {
		console.log(request.headers)
		request.on("data", chunk => {
			fs.writeFileSync("forms/" + request.headers.date, chunk)
		})
		response.writeHead(404, { "Content-Type": "text/plain" })
		response.end("recieved")
		return
	}

	if (request.url.startsWith("/api/templates")) {
		response.writeHead(200, { "Content-Type": "application/json" })
		var files = { "files": fs.readdirSync("templates") }
		response.end(JSON.stringify(files))
		return;
	} else if (request.url.startsWith("/templates")) {
		request.url = "." + request.url
		if (!fs.existsSync(request.url)) {
			response.writeHead(404, { "Content-Type": "text/plain" })
			response.end("Template not found")
		} else {
			response.writeHead(200, { "Content-Type": "application/json" })
			response.end(fs.readFileSync(request.url))
		}
		return
	}

	response.writeHead(404, { "Content-Type": "text/html" })
	response.end("Unknown Error")
}).listen(80)
