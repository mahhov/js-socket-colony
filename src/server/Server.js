const path = require('path');
const Net = require('./Net');
const HtmlHttpServer = require('./HtmlHttpServer');
const {ClientInterface} = require('./ClientInterface');
const {GAME_STATE_ENUM} = require('./Constants');

class Server {
	constructor(scriptPath, netHandler, lobby) {
		let htmlPath = path.resolve(__dirname, '../client/Client.html');
		let htmlHttpServer = new HtmlHttpServer(htmlPath, scriptPath, process.env.PORT || 5000);
		htmlHttpServer.start();
		let net = new Net(htmlHttpServer.server, netHandler);
		this.lobby = lobby;
	}

	loop() {
		this.lobby.cleanClosedClientsAndGames();

		let clientNames = this.lobby.clients.map(({name}) => name);
		ClientInterface.sendToClients(this.lobby.getLobbyClients(), {
			type: 'lobby',
			population: this.lobby.clients.length,
			clientNames,
			games: this.lobby.games.map(game => game.gameMessage),
		});

		this.lobby.games
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
	}

	start() {
		const UPDATE_GAME_PERIOD_MS = 1000 / 50;
		setInterval(() => this.loop(), UPDATE_GAME_PERIOD_MS);
	}
}

module.exports = Server;

// todo fix not skipping turn if no moves left
