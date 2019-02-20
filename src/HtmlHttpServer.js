const http = require('http');
const fs = require('fs'); // todo const fs = require('fs').promises;
const path = require('path');
const PromiseX = require('./PromiseX');

class FileHttpServer {
	constructor(relPath, port) {
		this.readFile = new PromiseX();

		fs.readFile(path.resolve(__dirname, relPath), (err, read) => {
			if (err)
				this.readFile.reject(err);
			else
				this.readFile.resolve(read);
		});

		this.port = port;
	}

	start() {
		http.createServer(async (request, response) => {
			response.writeHeader(200, {"Content-Type": "text/html"});
			response.end(await this.readFile);
		}).listen(this.port);
	}
}

module.exports = FileHttpServer;
