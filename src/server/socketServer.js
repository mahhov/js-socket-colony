const WebSocket = require('ws');
const HtmlHttpServer = require('./HtmlHttpServer');
const Rand = require('./rand');
const {CLIENT_STATE_ENUM, ClientInterface, PlayerClientInterface, BotClientInterface} = require('./ClientInterface');

const UPDATE_GAME_PERIOD_MS = 1000 / 50;
const NUM_CLIENTS_PER_GAME = 2;

const GAME_STATE_ENUM = {
	WAITING_FOR_PLAYERS: 0,
	IN_PROGRESS: 1,
	ABANDONED: 2,
};

const KEY_ENUM = {
	LEFT: 'a',
	RIGHT: 'd',
	DOWN: 's',
	UP: 'w',
	MOUSE: 'mouse',
};

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
		if (!inputs || !inputs.isTriggered(KEY_ENUM.MOUSE))
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
	constructor(server, messageHandler) {
		this.wss = new WebSocket.Server({server});
		this.wss.on('connection', ws => ws.on('message', message => {
			try {
				messageHandler(ws, JSON.parse(message));
			} catch (e) {
			}
		}));
	}
}

class Server {
	constructor() {
		this.clients = [];
		this.games = [];
	}

	findClient(clientId) {
		return this.clients.find(({id}) => id === clientId);
	}

	findGame(gameId) {
		return this.games.find(({id}) => id === gameId);
	}

	createPlayerClient(netClient) {
		let client = new PlayerClientInterface(netClient);
		this.clients.push(client);
		return client;
	}

	static changeClientName(client, name) {
		client.name = name;
	}

	createAndJoinGame(client, config) {
		let game = {
			id: Rand.randId(),
			name: Rand.randName(),
			state: GAME_STATE_ENUM.WAITING_FOR_PLAYERS,
			requiredClients: NUM_CLIENTS_PER_GAME,
			clients: [],
		};
		this.games.push(game);
		this.joinGame(client, game);
		if (config.bot)
			this.joinGame(new BotClientInterface(), game);
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
		client.game.state = GAME_STATE_ENUM.ABANDONED; // todo don't abbandon if spectator leaves
		client.game.clients = client.game.clients.filter(clientI => clientI !== client);
		client.game = null;
		client.state = CLIENT_STATE_ENUM.LOBBY;
	}

	static inputGame(client, input) {
		client.inputs.accumulateInput(input);
	}

	getLobbyClients() {
		return this.clients
			.filter(client => client.state === CLIENT_STATE_ENUM.LOBBY || client.game.state !== GAME_STATE_ENUM.IN_PROGRESS);
	}

	static getGameMessage(game) {
		let {id, name, state, clients} = game;
		return {
			id,
			name,
			state,
			population: clients.length,
		};
	}

	cleanClosedClientsAndGames() {
		this.clients = this.clients.filter(client => {
			if (client.isAlive())
				return true;
			if (client.game)
				this.leaveGame(client);
		});

		this.games = this.games.filter(game => game.clients.length);
	}
}

let htmlHttpServer = new HtmlHttpServer('../socketClient.html', process.env.PORT || 5000);
htmlHttpServer.start();

let server = new Server();
let net = new Net(htmlHttpServer.server, (netClient, message) => {
	let client = server.findClient(message.clientId);
	let game = server.findGame(message.gameId);

	switch (message.type) {
		case 'create-client':
			let {id, name} = server.createPlayerClient(netClient);
			PlayerClientInterface.sendToNetClient(netClient, {type: 'created-client', id, name});
			break;
		case 'change-client-name':
			if (client)
				Server.changeClientName(client, message.name);
			break;
		case 'create-game':
			if (client) {
				let {id, name} = server.createAndJoinGame(client, message.config);
				PlayerClientInterface.sendToNetClient(netClient, {type: 'created-game', id, name});
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
				Server.inputGame(client, message.input);
			break;
		default:
			console.warn('unrecognized message type:', message.type);
	}
});

setInterval(() => {
	server.cleanClosedClientsAndGames();

	let clientNames = server.clients.map(({name}) => name);
	ClientInterface.sendToClients(server.getLobbyClients(), {
		type: 'lobby',
		population: server.clients.length,
		clientNames,
		games: server.games.map(Server.getGameMessage),
	});

	server.games
		.forEach(game => {
			let inProgress = game.state === GAME_STATE_ENUM.IN_PROGRESS;
			if (inProgress)
				game.gameCore.update(game.clients.map(({inputs}) => inputs));
			let clientNames = game.clients.map(({name}) => name);
			ClientInterface.sendToClients(game.clients, {
				type: 'game',
				clientNames,
				data: inProgress && game.gameCore.getStateDiff(),
				game: Server.getGameMessage(game),
			});
		});
}, UPDATE_GAME_PERIOD_MS);
