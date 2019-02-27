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

	send(data) {
	}

	static sendToClients(clients, data) {
		clients.forEach(client => client.send(data));
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

	send(data) {
		PlayerClientInterface.sendToNetClient(this.netClient, data);
	}

	static sendToNetClient(netClient, data) {
		if (netClient.readyState !== WebSocket.OPEN)
			return;
		let stringData = JSON.stringify(data);
		netClient.send(stringData);
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