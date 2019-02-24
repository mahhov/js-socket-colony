const http = require('http');
const fs = require('fs').promises;
const path = require('path');

class FileHttpServer {
	constructor(relPath, port) {
		this.readFile = fs.readFile(path.resolve(__dirname, relPath));
		this.port = port;
	}

	start() {
		this.server = http.createServer(async (request, response) => {
			response.writeHeader(200, {"Content-Type": "text/html"});
			response.end(await this.readFile);
		});
		this.server.listen(this.port);
	}
}

module.exports = FileHttpServer;
