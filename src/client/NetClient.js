const PromiseX = require('./PromiseX');

class NetClient {
	constructor(serverUrl, messageHandler) {
		this.opened = new PromiseX();
		this.serverSocket = new WebSocket(serverUrl);
		this.serverSocket.addEventListener('open', () => this.opened.resolve());
		this.serverSocket.addEventListener('message', ({data}) => {
			try {
				messageHandler(JSON.parse(data));
			} catch (e) {
				console.error(e);
			}
		});
	}

	async send(data) {
		let stringData = JSON.stringify(data);
		await this.opened;
		this.serverSocket.send(stringData);
	}
}

module.exports = NetClient;
