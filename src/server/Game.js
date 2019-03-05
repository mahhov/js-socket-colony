const Rand = require('./Rand');
const {GAME_STATE_ENUM} = require('./Constants');

class Game {
	constructor(requiredClients) {
		this.id = Rand.randId();
		this.name = Rand.randName();
		this.state = GAME_STATE_ENUM.WAITING_FOR_PLAYERS;
		this.clients = [];
		this.requiredClients = requiredClients;
	}

	addClient(client) {
		this.clients.push(client);
		if (this.clients.length === this.requiredClients && this.state === GAME_STATE_ENUM.WAITING_FOR_PLAYERS) {
			this.state = GAME_STATE_ENUM.IN_PROGRESS;
			this.startTime = process.hrtime()[0];
		}
		return this.clients.length - 1;
	}

	removeClient(client) {
		let index = this.clients.findIndex(clientI => clientI === client);
		if (index < this.requiredClients)
			this.state = GAME_STATE_ENUM.ABANDONED;
		this.clients.splice(index, 1);
	}

	play() {
	}

	get stateDiff() {
	}

	get gameMessage() {
		return {
			id: this.id,
			name: this.name,
			state: this.state,
			population: this.clients.length,
		};
	}
}

module.exports = Game;
