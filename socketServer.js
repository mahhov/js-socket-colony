const WebSocket = require('ws');

const UPDATE_GAME_PERIOD_MS = 1000 / 50;
const NUM_CLIENTS_PER_GAME = 2;

const GAME_STATE_ENUM = {
	WAITING_FOR_PLAYERS: 0,
	IN_PROGRESS: 1,
	ENDED: 2,
};

const KEY_ENUM = {
	LEFT: 'a',
	RIGHT: 'd',
	DOWN: 's',
	UP: 'w',
	MOUSE: 'mouse',
};

const KEY_STATE_ENUM = {
	UP: 0,
	DOWN: 1,
	PRESSED: 2,
	TAPPED: 3,
};

const INPUT_STATE_ENUM = {
	RELEASED: 1,
	PRESSED: 2,
	TAPPED: 3
};

class Inputs {
	constructor() {
		this.keys = {};
		this.mouse = {};
		this.resetAccumulatedInputs();
	}

	resetAccumulatedInputs() {
		this.accumulatedInputs = {
			keys: {},
			mouse: null,
		};
	}

	isDown(key) {
		return !!this.keys[key];
	}

	isTriggered(key) {
		return this.keys[key] === KEY_STATE_ENUM.PRESSED || this.keys[key] === KEY_STATE_ENUM.TAPPED
	}

	accumulateInput(input) {
		this.accumulateKeyInput(input.keys);
		if (input.mouse.x && input.mouse.y)
			this.accumulatedInputs.mouse = input.mouse;
	}

	accumulateKeyInput(input) {
		Object.entries(input).forEach(([key, value]) => {
			if (value !== INPUT_STATE_ENUM.RELEASED)
				this.accumulatedInputs.keys[key] = value;

			// null -> release
			// release -> release
			// pressed -> tapped
			// tapped -> tapped
			else if (this.accumulatedInputs.keys[key] === INPUT_STATE_ENUM.PRESSED)
				this.accumulatedInputs.keys[key] = INPUT_STATE_ENUM.TAPPED;
			else if (!this.accumulatedInputs.keys[key])
				this.accumulatedInputs.keys[key] = INPUT_STATE_ENUM.RELEASED;
		});
	}

	applyAccumulatedInputs() {
		// age keys
		Object.entries(this.keys).forEach(([key, value]) => {
			if (value === KEY_STATE_ENUM.PRESSED)
				this.keys[key] = KEY_STATE_ENUM.DOWN;
			else if (value === KEY_STATE_ENUM.TAPPED)
				this.keys[key] = KEY_STATE_ENUM.UP;
		});

		// apply accumulatedInputs to keys
		Object.entries(this.accumulatedInputs.keys).forEach(([key, value]) => {
			switch (value) {
				case INPUT_STATE_ENUM.RELEASED:
					this.keys[key] = KEY_STATE_ENUM.UP;
					break;
				case INPUT_STATE_ENUM.PRESSED:
					if (this.keys[key] !== KEY_STATE_ENUM.DOWN)
						this.keys[key] = KEY_STATE_ENUM.PRESSED;
					break;
				case INPUT_STATE_ENUM.TAPPED:
					this.keys[key] = KEY_STATE_ENUM.TAPPED;
					break;

			}
		});

		// update mouse
		if (this.accumulatedInputs.mouse)
			this.mouse = this.accumulatedInputs.mouse;

		this.resetAccumulatedInputs();
	}
}

class Game {
	constructor(width, height) {
		this.width = width;
		this.height = height;
		this.board = Array(width).fill().map(() => Array(height).fill(0));
	}

	update() {
		inputs.applyAccumulatedInputs();
		let mouseInput = this.getMouseInput();
		if (mouseInput)
			this.board[mouseInput.x][mouseInput.y] = 1;
	}

	getMouseInput() {
		if (!inputs.isTriggered(KEY_ENUM.MOUSE))
			return;
		let x = parseInt(this.width * inputs.mouse.x);
		let y = parseInt(this.height * inputs.mouse.y);
		if (x < 0 || x >= this.width || y < 0 || y >= this.height)
			return;
		return {x, y};
	}

	getStateDiff() {
		return {
			width: this.width,
			height: this.height,
			board: this.board,
		};
	}
}

class Net {
	constructor(port, messageHandler) {
		this.wss = new WebSocket.Server({port});
		this.wss.on('connection', ws => ws.on('message', message => {
			try {
				messageHandler(ws, JSON.parse(message));
			} catch (e) {
			}
		}));
	}

	send(clients, data) {
		let stringData = JSON.stringify(data);
		clients
			.filter(client => client.readyState === WebSocket.OPEN)
			.forEach(client => client.send(stringData));
	}
}

class Server {
	constructor() {
		this.lobby = [];
		this.games = [];
		this.clients = [];
	}

	get randId() {
		return parseInt(Math.random() * 1e15) + 1;
	}

	findClient(clientId) {
		return this.clients.find(({id}) => id === clientId);
	}

	findGame(gameId) {
		return this.games.find(({id}) => id === gameId);
	}

	createClient(netClient) {
		let id = this.randId;
		this.clients.push({id, netClient});
		return id;
	}

	joinLobby(clientId) {
		if (this.findClient(clientId) && !this.lobby.includes(clientId))
			this.lobby.push(clientId);
	}

	createAndJoinGame(clientId) {
		if (!this.findClient(clientId))
			return;
		let id = this.randId;
		this.games.push({
			id,
			clients: [],
			requiredClients: NUM_CLIENTS_PER_GAME,
			state:
			inputsList
	:
		[],
	})
		;
		this.joinGame(clientId, id);
		return id;
	}

	joinGame(clientId, gameId) {
		if (!this.findClient(clientId))
			return;
		let game = this.findGame(gameId);
		if (!game || game.clients.includes(clientId))
			return;
		game.clients.push(clientId);
		game.inputs.push(new Inputs());
		if (game.clients.length === NUM_CLIENTS_PER_GAME) {
			game.status = 'In progress';
			game.game = new Game(10, 10);
		}
	}

	leaveGame(clientId, gameId) {
		if (!this.findClient(clientId))
			return;
		let game = this.findGame(gameId);
		if (!game || !game.clients.includes(clientId))
			return;
		game.clients = game.clients.filter(id => id !== clientId);
	}

	inputGame(clientId, input) {
		if (!this.findClient(clientId))
			return;
		let game = this.findGame(gameId);
		if (!game)
			return;
		let clientIndex = game.clients.indexOf(clientId);
		if (clientIndex === -1)
			return;
		game.inputs[clientIndex].accumulateInputs(input)
	}

	getLobbyNetClients() {
		return this.lobby
			.map(clientId => this.findClient(clientId))
			.map(client => client.netClient);
	}

	getGameClients(gameId) {
		return this.findGame(gameId).clients
			.map(clientId => this.findClient(clientId))
			.map(client => client.netClient);
	}
}

let game = new Game(10, 10);
let inputs = new Inputs();
let server = new Server();
let net = new Net(3003, (client, message) => {
	console.log('received', message);
	switch (message.type) {
		case 'create-client':
			let clientId = server.createClient(client);
			net.send([client], {type: 'created-client', clientId});
			break;
		case 'join-lobby':
			server.joinLobby(message.clientId);
			break;
		case 'create-game':
			let gameId = server.createAndJoinGame(message.clientId);
			net.send([client], {type: 'created-game', gameId});
			break;
		case 'join-game':
			server.joinGame(message.clientId, message.gameId);
			break;
		case 'leave-game':
			server.leaveGame(message.clientId, message.gameId);
			break;
		case 'input-game':
			server.inputGame(message.clientId, message.input);
			break;
		default:
			console.warn('unrecognized message type:', message.type);
	}

	inputs.accumulateInput(message);
});

setInterval(() => {
	net.send(server.getLobbyNetClients(), {
		type: 'lobby',
		population: server.clients.length,
		games: server.games.map(({id, clients, status}) => ({
			id,
			population: clients.length,
			status
		}))
	});

	server.games.forEach(game => {
		// update game
		// broadcas game
	});
}, UPDATE_GAME_PERIOD_MS);
