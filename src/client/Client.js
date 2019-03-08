const NetClient = require('./NetClient');
const View = require('./View');
const Controller = require('./Controller');

const SERVER_URL = process.env.SERVER_WS_ENDPIONT;
const SEND_INPUTS_PERIOD_MS = 1000 / 20;

class Client {
	constructor(gameState) {
		this.clientId = null;
		this.gameId = null;

		this.netClient = new NetClient(SERVER_URL, message => this.netListener(message));
		this.view = new View();
		this.controller = new Controller(this.view.canvas);
		this.gameState = gameState;
	}

	netListener(message) {
		switch (message.type) {
			case 'created-client':
				this.setClient(message.id, message.name);
				break;
			case 'created-game':
				this.setGame(message.id);
				break;
			case 'lobby':
				this.updateLobby(message.population, message.clientNames, message.games);
				break;
			case 'game':
				this.updateGame(message.data, message.game);
				break;
			default:
				console.warn('unrecognized message type:', message.type);
		}
	}

	startSendingGameInput() {
		setInterval(() => this.sendGameInput(), SEND_INPUTS_PERIOD_MS);
	}

	createClient() {
		this.netClient.send({type: 'create-client'});
	}

	setClient(id, name) {
		this.clientId = id;
		this.view.setClientName(name);
	}

	requestUsernameChange(name) {
		this.netClient.send({
			type: 'change-client-name',
			clientId: this.clientId,
			name,
		});
	}

	createGame(config) {
		this.netClient.send({
			type: 'create-game',
			clientId: this.clientId,
			config,
		});
	}

	joinGame(gameId) {
		this.netClient.send({
			type: 'join-game',
			clientId: this.clientId,
			gameId,
		});
		this.setGame(gameId);
	}

	setGame(gameId) {
		this.gameId = gameId;
		this.gameState.resetData();
		this.view.gameMode();
	}

	leaveGame() {
		this.netClient.send({
			type: 'leave-game',
			clientId: this.clientId,
		});
		this.gameId = null;
		this.view.lobbyMode();
	}

	updateLobby(population, clientNames, games) {
		this.view.updateLobby(population, clientNames, games);
	}

	updateGame(data, game) {
		this.controller.setGeometry(this.gameState.getMouseTargetGeometry(this.view.canvas));
		if (data)
			this.gameState.setData(data);
		this.gameState.draw(this.view.canvas, this.view.canvasCtx);
		this.view.updateGame(game.name, game.state);
	}

	sendGameInput() {
		if (this.gameId)
			this.netClient.send({
				type: 'input-game',
				clientId: this.clientId,
				gameId: this.gameId,
				input: this.controller.inputs.getAccumulatedInputs(),
			});
	}
}

module.exports = Client;

// todo Clienet should be game agnostic, gameState is not, so client should not own a reference to gamestate
