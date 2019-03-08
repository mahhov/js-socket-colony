const Net = require('./Net');
const Lobby = require('./Lobby');
const HtmlHttpServer = require('./HtmlHttpServer');
const {CLIENT_STATE_ENUM, ClientInterface, PlayerClientInterface, DummyPlayerClientInterface, BotClientInterface} = require('./ClientInterface');
const {GAME_STATE_ENUM} = require('./Constants');

const UPDATE_GAME_PERIOD_MS = 1000 / 50;

// todo extract ../client/ColonyClient.html
let htmlHttpServer = new HtmlHttpServer('../client/Client.html', '../colony/ColonyClient.js', process.env.PORT || 5000);
htmlHttpServer.start();

let lobby = new Lobby();
let net = new Net(htmlHttpServer.server, (netClient, message) => {
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
});

setInterval(() => {
	lobby.cleanClosedClientsAndGames();

	let clientNames = lobby.clients.map(({name}) => name);
	ClientInterface.sendToClients(lobby.getLobbyClients(), {
		type: 'lobby',
		population: lobby.clients.length,
		clientNames,
		games: lobby.games.map(game => game.gameMessage),
	});

	lobby.games
		.forEach(game => {
			let inProgress = game.state === GAME_STATE_ENUM.IN_PROGRESS;
			if (inProgress)
				game.play();
			let clientNames = game.clients.map(({name}) => name);
			ClientInterface.sendToClients(game.clients, {
				type: 'game',
				clientNames,
				data: inProgress && game.stateDiff,
				game: game.gameMessage,
			});
		});
}, UPDATE_GAME_PERIOD_MS);

// todo fix not skipping turn if no moves left
