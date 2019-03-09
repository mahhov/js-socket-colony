const path = require('path');
const Net = require('./Net');
const Lobby = require('./Lobby');
const HtmlHttpServer = require('./HtmlHttpServer');
const {ClientInterface, PlayerClientInterface} = require('./ClientInterface');
const {GAME_STATE_ENUM} = require('./Constants');

// todo make class

let init = (scriptPath, netHandler, lobby) => {
	const UPDATE_GAME_PERIOD_MS = 1000 / 50;

	let htmlPath = path.resolve(__dirname, '../client/Client.html');
	let htmlHttpServer = new HtmlHttpServer(htmlPath, scriptPath, process.env.PORT || 5000);
	htmlHttpServer.start();

	let net = new Net(htmlHttpServer.server, netHandler);

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
};

module.exports = init;

// todo fix not skipping turn if no moves left
