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
	constructor(width = 20, height = 20) {
		this.width = width;
		this.height = height;
		this.board = Array(width).fill().map(() => Array(height).fill(0));
		this.board[0][0] = 1;
		this.board[width - 1][height - 1] = 2;
		this.turn = 0;
		this.selected = {};
	}

	update(inputsList) {
		inputsList.forEach((inputs, i) =>
			inputs.applyAccumulatedInputs());

		let mouseInput = this.getMouseInput(inputsList[this.turn]);
		if (!mouseInput)
			return;
		let tile = this.board[mouseInput.x][mouseInput.y];
		console.log('mouseInput', mouseInput, 'turn', this.turn, 'selected', this.selected, 'tile', tile)
		if (tile === this.turn + 1)
			this.selected = mouseInput;
		else if (tile === 0 && Game.areNear(mouseInput, this.selected, 1)) {
			this.propagate(mouseInput, this.turn + 1);
			this.changeTurn();
		} else if (tile === 0 && Game.areNear(mouseInput, this.selected, 2)) {
			this.propagate(mouseInput, this.turn + 1);
			this.remove(this.selected);
			this.changeTurn();
		}
	}

	static areNear(p1, p2, dist) {
		return Math.abs(p1.x - p2.x) <= dist && Math.abs(p1.y - p2.y) <= dist;
	}

	propagate(point, tile) {
		console.log('propogate')
		for (let x = point.x - 1; x <= point.x + 1; x++)
			for (let y = point.y - 1; y <= point.y + 1; y++)
				if (this.inBounds(x, y) && this.board[x][y])
					this.board[x][y] = tile
	}

	remove(point) {
		console.log('remove')
		this.board[ponit.x][ponit.y] = 0;
	}

	inBounds(x, y) {
		return x >= 0 && x < this.width && y >= 0 && y < this.height;
	}

	changeTurn() {
		console.log('change turn')
		this.turn = ++this.turn % 2;
		this.selected = {};
	}

	getMouseInput(inputs) {
		if (!inputs.isTriggered(KEY_ENUM.MOUSE))
			return;
		let x = parseInt(this.width * inputs.mouse.x);
		let y = parseInt(this.height * inputs.mouse.y);
		if (x < 0 || x >= this.width || y < 0 || y >= this.height)
			return;
		return {x, y};
	}

	getStateDiff() {
		return this;
		// return {
		// 	width: this.width,
		// 	height: this.height,
		// 	board: this.board,
		// 	turn: this.turn,
		// 	selected: this.selected,
		// };
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

	static get randId() {
		return parseInt(Math.random() * 1e15) + 1;
	}

	findClient(clientId) {
		return this.clients.find(({id}) => id === clientId);
	}

	findGame(gameId) {
		return this.games.find(({id}) => id === gameId);
	}

	createClient(netClient) {
		let id = Server.randId;
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
		let id = Server.randId;
		this.games.push({
			id,
			clients: [],
			requiredClients: NUM_CLIENTS_PER_GAME,
			state: GAME_STATE_ENUM.WAITING_FOR_PLAYERS,
			inputsList: [],
		});
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
		game.inputsList.push(new Inputs());
		if (game.clients.length === NUM_CLIENTS_PER_GAME) {
			game.state = GAME_STATE_ENUM.IN_PROGRESS;
			game.game = new Game();
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

	inputGame(clientId, gameId, input) {
		if (!this.findClient(clientId))
			return;
		let game = this.findGame(gameId);
		if (!game)
			return;
		let clientIndex = game.clients.indexOf(clientId);
		if (clientIndex === -1)
			return;
		game.inputsList[clientIndex].accumulateInput(input)
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

let server = new Server();
let net = new Net(3003, (client, message) => {
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
			server.inputGame(message.clientId, message.gameId, message.input);
			break;
		default:
			console.warn('unrecognized message type:', message.type);
	}
});

setInterval(() => {
	net.send(server.getLobbyNetClients(), {
		type: 'lobby',
		repeat: true,
		population: server.clients.length,
		games: server.games.map(({id, clients, state}) => ({
			id,
			population: clients.length,
			state,
		}))
	});

	server.games
		.filter(({state}) => state === GAME_STATE_ENUM.IN_PROGRESS)
		.forEach(({id, clients, inputsList, game}) => {
			game.update(inputsList);
			net.send(server.getGameClients(id), {
				type: 'game',
				repeat: true,
				clientIds: clients,
				data: game.getStateDiff()
			});
		});
}, UPDATE_GAME_PERIOD_MS);
