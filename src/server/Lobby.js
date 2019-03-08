const {CLIENT_STATE_ENUM, PlayerClientInterface, DummyPlayerClientInterface, BotClientInterface} = require('./ClientInterface');
const ColonyBot = require('../colony/ColonyBot');
const {GAME_STATE_ENUM} = require('./Constants');
const ColonyGame = require('../colony/ColonyGame');

class Lobby {
	constructor() {
		this.clients = [];
		this.games = [];
	}

	findClient(clientId) {
		return this.clients.find(({id}) => id === clientId);
	}

	findAllClients(clientId) {
		return this.clients.filter(({id}) => id === clientId);
	}

	findGame(gameId) {
		return this.games.find(({id}) => id === gameId);
	}

	addClient(client, game) {
		this.clients.push(client);
		if (game)
			client.joinGame(game);
	}

	createAndJoinGame(client, config) {
		let game = new ColonyGame();
		this.games.push(game);

		switch (config.bot) {
			case 1:
				client.joinGame(game);
				this.addClient(new BotClientInterface(ColonyBot.scoreCounts), game);
				break;
			case 2:
				this.addClient(new BotClientInterface(ColonyBot.scoreCounts), game);
				this.addClient(new BotClientInterface(ColonyBot.scoreCounts), game);
				client.joinGame(game);
				break;
			case 0:
			default:
				client.joinGame(game);
				if (config.local)
					this.addClient(new DummyPlayerClientInterface(client), game);
				break;
		}
		return game;
	}

	getLobbyClients() {
		return this.clients
			.filter(client => client.state === CLIENT_STATE_ENUM.LOBBY || client.game.state !== GAME_STATE_ENUM.IN_PROGRESS);
	}

	cleanClosedClientsAndGames() {
		this.clients = this.clients.filter(client => {
			if (client.isAlive())
				return true;
			client.leaveGame();
		});

		this.games = this.games.filter(game => game.clients.length);
	}
}

module.exports = Lobby;
