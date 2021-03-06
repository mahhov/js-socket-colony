const WebSocket = require('ws');
const Rand = require('./Rand');
const Inputs = require('./Inputs');
const ColonyBot = require('../colony/ColonyBot');
const Board = require('../colony/ColonyBoard');
const {GAME_STATE_ENUM} = require('./Constants');

const CLIENT_STATE_ENUM = {
	LOBBY: 0,
	IN_GAME: 1,
};

const KEY_ENUM = {
	LEFT: 'a',
	RIGHT: 'd',
	DOWN: 's',
	UP: 'w',
	MOUSE: 'mouse',
};

class ClientInterface {
	constructor() {
		this.id = Rand.randId();
		this.name = Rand.randName();
		this.state = CLIENT_STATE_ENUM.LOBBY;
		this.game = null;
	}

	joinGame(game) {
		if (this.game === game)
			return;
		if (this.game)
			this.leaveGame();
		this.game = game;
		this.state = CLIENT_STATE_ENUM.IN_GAME;
		this.clientIndex = game.addClient(this);
		this.tile = this.clientIndex + 1;
	}

	leaveGame() {
		if (!this.game)
			return;
		this.game.removeClient(this);
		this.game = null;
		this.state = CLIENT_STATE_ENUM.LOBBY;
	}

	isAlive() {
		return false;
	}

	send(message) {
	}

	static sendToClients(clients, message) {
		clients.forEach(client => client.send(message));
	}

	iter() {
	}

	play() {
	}
}

class PlayerClientInterface extends ClientInterface {
	constructor(netClient) {
		super();
		this.inputs = new Inputs();
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

	iter() {
		this.inputs.applyAccumulatedInputs();
	}

	play() {
		let mouseInput = this.getMouseInput();
		if (!mouseInput)
			return;
		let tile = this.game.board.tiles[mouseInput.x][mouseInput.y];
		if (tile === this.tile)
			this.game.select(mouseInput);
		else if (tile === 0)
			this.game.applyMove(this.game.selected, mouseInput, this.tile);
	}

	getMouseInput() {
		if (!this.inputs.isTriggered(KEY_ENUM.MOUSE))
			return;
		let x = Math.floor(this.game.board.width * this.inputs.mouse.x);
		let y = Math.floor(this.game.board.height * this.inputs.mouse.y);
		if (this.game.board.inBounds(x, y))
			return {x, y};
	}
}

class DummyPlayerClientInterface extends PlayerClientInterface {
	constructor(parentPlayerClientInterface) {
		super();
		this.id = parentPlayerClientInterface.id;
		this.name = parentPlayerClientInterface.name + '-pair';
		this.inputs = new Inputs();
		this.parentPlayerClientInterface = parentPlayerClientInterface;
	}

	isAlive() {
		return this.parentPlayerClientInterface.isAlive() && this.game.state === GAME_STATE_ENUM.IN_PROGRESS;
	}

	send(message) {
	}
}

class BotClientInterface extends ClientInterface {
	constructor(scoreFunction, depth = 1, maxPlayTimer = 15) {
		super();
		this.name += '-bot';
		this.scoreFunction = scoreFunction;
		this.depth = depth;
		this.maxPlayTimer = maxPlayTimer;
		this.playTimer = 0;
	}

	isAlive() {
		return this.game.clients.length >= 2 && this.game.state === GAME_STATE_ENUM.IN_PROGRESS;
	}

	play() {
		if (!this.playTimer) {
			this.calcPlay();
			this.game.select(this.queuedPlay.move.from);
		}
		if (this.playTimer++ === this.maxPlayTimer) {
			this.game.applyMove(this.queuedPlay.move.from, this.queuedPlay.move.to, this.tile);
			this.playTimer = 0;
		}
	}

	calcPlay() {
		let board = Board.createFromTiles(this.game.board.tiles);
		this.queuedPlay = ColonyBot.play(board, this.scoreFunction, this.tile, this.depth);
	}
}

module.exports = {CLIENT_STATE_ENUM, ClientInterface, PlayerClientInterface, DummyPlayerClientInterface, BotClientInterface};

// todo extract colony specific classes
