const {DummyPlayerClientInterface, BotClientInterface} = require('./ColonyClientInterface');
const ColonyBot = require('./ColonyBot');
const ColonyGame = require('./ColonyGame');
const Lobby = require('../server/Lobby');

class ColonyLobby extends Lobby {
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
}

module.exports = ColonyLobby;
