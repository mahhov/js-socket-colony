const WebSocket = require('ws');
const Rand = require('./rand');
const Inputs = require('./Inputs');
const ColonyBot = require('../ColonyBot');

const CLIENT_STATE_ENUM = {
	LOBBY: 0,
	IN_GAME: 1,
};

class ClientInterface {
	constructor() {
		this.id = Rand.randId();
		this.name = Rand.randName();
		this.state = CLIENT_STATE_ENUM.LOBBY;
		this.game = null;
		this.inputs = new Inputs();
	}

	isAlive() {
		return false;
	}

	send(message) {
	}

	static sendToClients(clients, message) {
		clients.forEach(client => client.send(message));
	}
}

class PlayerClientInterface extends ClientInterface {
	constructor(netClient) {
		super();
		this.netClient = netClient;
	}

	isAlive() {
		return this.netClient.readyState !== WebSocket.CLOSED;
	}

	send(message) {
		PlayerClientInterface.sendToNetClient(this.netClient, message);
	}

	static sendToNetClient(netClient, message) {
		if (netClient.readyState !== WebSocket.OPEN)
			return;
		let stringMessage = JSON.stringify(message);
		netClient.send(stringMessage);
	}
}

class BotClientInterface extends ClientInterface {
	constructor() {
		super();
	}

	isAlive() {
		return this.game.clients.length === 2;
	}

	send(data) {
		console.log('bot recieved', data)

		/* todo react to data */

		/* todo set this.inputs */
	}
}

module.exports = {CLIENT_STATE_ENUM, ClientInterface, PlayerClientInterface, BotClientInterface};