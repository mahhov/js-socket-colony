const WebSocket = require('ws');

const UPDATE_GAME_PERIOD_MS = 1000 / 50;
const NUM_CLIENTS_PER_GAME = 2;

const CLIENT_STATE_ENUM = {
	LOBBY: 0,
	IN_GAME: 1,
};

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
	constructor(width = 10, height = 10) {
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
		for (let x = point.x - 1; x <= point.x + 1; x++)
			for (let y = point.y - 1; y <= point.y + 1; y++)
				if (this.inBounds(x, y) && this.board[x][y])
					this.board[x][y] = tile;
		this.board[point.x][point.y] = tile
	}

	remove(point) {
		this.board[point.x][point.y] = 0;
	}

	inBounds(x, y) {
		return x >= 0 && x < this.width && y >= 0 && y < this.height;
	}

	changeTurn() {
		this.turn = ++this.turn % 2;
		this.selected = {};
	}

	getMouseInput(inputs) {
		if (!inputs.isTriggered(KEY_ENUM.MOUSE))
			return;
		let x = Math.floor(this.width * inputs.mouse.x);
		let y = Math.floor(this.height * inputs.mouse.y);
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
		console.log('port:', port);
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
		this.clients = [];
		this.games = [];
	}

	static get randId() {
		return parseInt(Math.random() * 1e15) + 1;
	}

	static get randName() {
		const NAMES = ['alligator', 'crocodile', 'alpaca', 'ant', 'antelope', 'ape', 'armadillo', 'donkey', 'baboon', 'badger', 'bat', 'bear', 'beaver', 'bee', 'beetle', 'buffalo', 'butterfly', 'camel', 'carabao', 'water buffalo', 'caribou', 'cat', 'cattle', 'cheetah', 'chimpanzee', 'chinchilla', 'cicada', 'clam', 'cockroach', 'cod', 'coyote', 'crab', 'cricket', 'crow', 'raven', 'deer', 'dinosaur', 'dog', 'dolphin', 'porpoise', 'duck', 'eagle', 'echidna', 'eel', 'elephant', 'elk', 'ferret', 'fish', 'fly', 'fox', 'frog', 'toad', 'gerbil', 'giraffe', 'gnat', 'gnu', 'wildebeest', 'goat', 'goldfish', 'goose', 'gorilla', 'grasshopper', 'guinea pig', 'hamster', 'hare', 'hedgehog', 'herring', 'hippopotamus', 'hornet', 'horse', 'hound', 'hyena', 'impala', 'insect', 'jackal', 'jellyfish', 'kangaroo', 'wallaby', 'koala', 'leopard', 'lion', 'lizard', 'llama', 'locust', 'louse', 'macaw', 'mallard', 'mammoth', 'manatee', 'marten', 'mink', 'minnow', 'mole', 'monkey', 'moose', 'mosquito', 'mouse', 'rat', 'mule', 'muskrat', 'otter', 'ox', 'oyster', 'panda', 'pig', 'hog', 'swine', 'wild pig', 'platypus', 'porcupine', 'prairie dog', 'pug', 'rabbit', 'raccoon', 'reindeer', 'rhinoceros', 'salmon', 'sardine', 'scorpion', 'seal', 'sea lion', 'serval', 'shark', 'sheep', 'skunk', 'snail', 'snake', 'spider', 'squirrel', 'swan', 'termite', 'tiger', 'trout', 'turtle', 'tortoise', 'walrus', 'wasp', 'weasel', 'whale', 'wolf', 'wombat', 'woodchuck', 'worm', 'yak', 'yellowjacket', 'zebra'];
		return NAMES[parseInt(Math.random() * NAMES.length)];
	}

	findClient(clientId) {
		return this.clients.find(({id}) => id === clientId);
	}

	findGame(gameId) {
		return this.games.find(({id}) => id === gameId);
	}

	createClient(netClient) {
		let client = {
			id: Server.randId,
			name: Server.randName,
			state: CLIENT_STATE_ENUM.LOBBY,
			game: null,
			inputs: new Inputs(),
			netClient,
		};
		this.clients.push(client);
		return client;
	}

	changeClientName(client, name) {
		client.name = name;
	}

	createAndJoinGame(client) {
		let game = {
			id: Server.randId,
			name: Server.randName,
			state: GAME_STATE_ENUM.WAITING_FOR_PLAYERS,
			requiredClients: NUM_CLIENTS_PER_GAME,
			clients: [],
		};
		this.games.push(game);
		this.joinGame(client, game);
		return game;
	}

	joinGame(client, game) {
		if (client.game === game)
			return;
		if (client.game)
			this.leaveGame(client);
		client.game = game;
		client.state = CLIENT_STATE_ENUM.IN_GAME;
		game.clients.push(client);
		if (game.clients.length === NUM_CLIENTS_PER_GAME) {
			game.state = GAME_STATE_ENUM.IN_PROGRESS;
			game.gameCore = new Game();
		}
	}

	leaveGame(client) {
		client.game.clients = client.game.clients.filter(clientI => clientI !== client);
		client.game = null;
		client.state = CLIENT_STATE_ENUM.LOBBY;
	}

	inputGame(client, input) {
		client.inputs.accumulateInput(input);
	}

	getLobbyNetClients() {
		return this.clients
			.filter(client => client.state === CLIENT_STATE_ENUM.LOBBY || client.game.state !== GAME_STATE_ENUM.IN_PROGRESS)
			.map(client => client.netClient);
	}

	getGameClients(game) {
		return game.clients.map(client => client.netClient);
	}

	cleanClosedClients() {
		this.clients = this.clients.filter(client => {
			if (client.netClient.readyState !== WebSocket.CLOSED)
				return true;
			if (client.game)
				this.leaveGame(client);
		});
	}
}

let server = new Server();
let net = new Net(3003, (netClient, message) => {
	let client = server.findClient(message.clientId);
	let game = server.findGame(message.gameId);

	switch (message.type) {
		case 'create-client':
			let {id, name} = server.createClient(netClient);
			net.send([netClient], {type: 'created-client', id, name});
			break;
		case 'change-client-name':
			if (client)
				server.changeClientName(client, message.name);
			break;
		case 'create-game':
			if (client) {
				let {id, name} = server.createAndJoinGame(client);
				net.send([netClient], {type: 'created-game', id, name});
			}
			break;
		case 'join-game':
			if (client && game)
				server.joinGame(client, game);
			break;
		case 'leave-game':
			if (client)
				server.leaveGame(client);
			break;
		case 'input-game':
			if (client)
				server.inputGame(client, message.input);
			break;
		default:
			console.warn('unrecognized message type:', message.type);
	}
});

setInterval(() => {
	server.cleanClosedClients();

	let clientNames = server.clients.map(({name}) => name);
	net.send(server.getLobbyNetClients(), {
		type: 'lobby',
		population: server.clients.length,
		clientNames,
		games: server.games.map(({id, name, state, clients}) => ({
			id,
			name,
			state,
			population: clients.length,
		}))
	});

	server.games
		.filter(({state}) => state === GAME_STATE_ENUM.IN_PROGRESS)
		.forEach(game => {
			let clientInputs = game.clients.map(({inputs}) => inputs);
			let clientNames = game.clients.map(({name}) => name);
			game.gameCore.update(clientInputs);
			net.send(server.getGameClients(game), {
				type: 'game',
				clientNames,
				data: game.gameCore.getStateDiff(),
			});
		});
}, UPDATE_GAME_PERIOD_MS);
