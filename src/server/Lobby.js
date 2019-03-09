const {CLIENT_STATE_ENUM} = require('./ClientInterface');
const {GAME_STATE_ENUM} = require('./Constants');

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
		/* override */
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
