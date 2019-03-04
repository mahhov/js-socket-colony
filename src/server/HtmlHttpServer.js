const http = require('http');
const path = require('path');
const inlineScripts = require('inline-scripts');

class HtmlHttpServer {
	constructor(relPath, port) {
		let htmlPath = path.resolve(__dirname, relPath);
		process.env.SERVER_WS_ENDPIONT = process.env.SERVER_WS_ENDPOINT || 'ws://localhost:5000';
		this.readFile_ = inlineScripts.inlineEnvironmentVariables(htmlPath);
		this.port = port;
	}

	start() {
		this.server = http.createServer(async (request, response) => {
			response.writeHeader(200, {"Content-Type": "text/html"});
			response.end(await this.readFile_);
		});
		this.server.listen(this.port);
	}
}

module.exports = HtmlHttpServer;
