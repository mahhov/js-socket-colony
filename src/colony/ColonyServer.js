const path = require('path');
const Lobby = require('./ColonyLobby');
const {PlayerClientInterface} = require('./ColonyClientInterface');
const Server = require('../server/Server');

let scriptPath = path.resolve(__dirname, './ColonyClient.js');

let netHandler = (netClient, message) => {
	let client = lobby.findClient(message.clientId);
	let game = lobby.findGame(message.gameId);

	switch (message.type) {
		case 'create-client':
			let createdClient = new PlayerClientInterface(netClient);
			lobby.addClient(createdClient);
			let {id, name} = createdClient;
			PlayerClientInterface.sendToNetClient(netClient, {type: 'created-client', id, name});
			break;
		case 'change-client-name':
			if (client)
				client.name = message.name;
			break;
		case 'create-game':
			if (client) {
				let {id, name} = lobby.createAndJoinGame(client, message.config);
				PlayerClientInterface.sendToNetClient(netClient, {type: 'created-game', id, name});
			}
			break;
		case 'join-game':
			if (client && game)
				client.joinGame(game);
			break;
		case 'leave-game':
			if (client)
				client.leaveGame();
			break;
		case 'input-game':
			if (client) {
				lobby
					.findAllClients(message.clientId)
					.forEach(client => client.inputs.accumulateInput(message.input));
			}
			break;
		default:
			console.warn('unrecognized message type:', message.type);
	}
};

let lobby = new Lobby();

new Server(scriptPath, netHandler, lobby).start();

// todo init withh colony configuration, e.g. client html, client.js, and subclassed server/lobby
