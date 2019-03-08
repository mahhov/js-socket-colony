const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const inlineScripts = require('inline-scripts');

class HtmlHttpServer {
	constructor(htmlRelPath, scriptRelPath, port) {
		let htmlPath = path.resolve(__dirname, htmlRelPath);
		let scriptPath = path.resolve(__dirname, scriptRelPath);
		process.env.SERVER_WS_ENDPIONT = process.env.SERVER_WS_ENDPOINT || 'ws://localhost:5000';
		let htmlRead_ = fs.readFile(htmlPath, 'utf8');
		let scriptRead_ = inlineScripts.inlineEnvironmentVariables(scriptPath);
		this.serve_ = HtmlHttpServer.concatReads(htmlRead_, scriptRead_);
		this.port = port;
	}

	static async concatReads(htmlRead, scriptRead) {
		htmlRead = await htmlRead;
		scriptRead = await scriptRead;
		return `${htmlRead}<script>${scriptRead}</script>}`;
	}

	start() {
		this.server = http.createServer(async (request, response) => {
			response.writeHeader(200, {"Content-Type": "text/html"});
			response.end(await this.serve_);
		});
		this.server.listen(this.port);
	}
}

module.exports = HtmlHttpServer;
