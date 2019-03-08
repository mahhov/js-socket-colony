const WebSocket = require('ws');

class Net {
	constructor(server, messageHandler) {
		this.wss = new WebSocket.Server({server});
		this.wss.on('connection', ws => ws.on('message', message => {
			try {
				messageHandler(ws, JSON.parse(message));
			} catch (e) {
				console.error(e);
			}
		}));
	}
}

module.exports = Net;
