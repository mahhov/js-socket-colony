const http = require('http');
const fs = require('fs');
const PromiseX = require('./PromiseX');

class FileHttpServer {
	constructor(path, port) {
		this.readFile = new PromiseX();

		fs.readFile(path, (err, read) => {
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
