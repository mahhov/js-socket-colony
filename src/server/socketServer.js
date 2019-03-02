const WebSocket = require('ws');
const HtmlHttpServer = require('./HtmlHttpServer');
const Rand = require('./Rand');
const {CLIENT_STATE_ENUM, ClientInterface, PlayerClientInterface, BotClientInterface} = require('./ClientInterface');
const Board = require('../Board');
const ColonyBot = require('../ColonyBot');
const {GAME_STATE_ENUM} = require('../Constants');

const UPDATE_GAME_PERIOD_MS = 1000 / 50;
const NUM_CLIENTS_PER_GAME = 2;

class Game {
	constructor() {
		this.id = Rand.randId();
		this.name = Rand.randName();
		this.state = GAME_STATE_ENUM.WAITING_FOR_PLAYERS;
		this.requiredClients = NUM_CLIENTS_PER_GAME;
		this.clients = [];

		// todo create sub class ColonyGame
		this.board = new Board();
		this.turn = 0;
		this.selected = {};
	}

	addClient(client) {
		this.clients.push(client);
		if (this.clients.length === NUM_CLIENTS_PER_GAME && this.state === GAME_STATE_ENUM.WAITING_FOR_PLAYERS)
			this.state = GAME_STATE_ENUM.IN_PROGRESS;
		return this.clients.length - 1;
	}

	removeClient(client) {
		let index = this.clients.findIndex(clientI => clientI === client);
		if (index < NUM_CLIENTS_PER_GAME)
			this.state = GAME_STATE_ENUM.ABANDONED;
		this.clients.splice(index, 1);
	}

	play() {
		this.clients.forEach(client => client.iter());
		this.clients[this.turn].play();
	}

	applyMove(from, to, tile) {
		if (this.board.applyMove(from, to, tile))
			this.changeTurn()
	}

	changeTurn() {
		this.selected = {};
		let nextTurn = ++this.turn % 2;
		if (this.board.getPossibleMoves(nextTurn + 1).length)
			this.turn = nextTurn;
		else if (!this.board.getPossibleMoves(this.turn + 1).length)
			this.state = GAME_STATE_ENUM.ENDED;
	}

	select(selected) {
		this.selected = selected;
	}

	getStateDiff() {
		return {
			width: this.board.width,
			height: this.board.height,
			tiles: this.board.tiles,
			turn: this.turn,
			selected: this.selected,
		};
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

	addClient(client, game) {
		this.clients.push(client);
		if (game)
			client.joinGame(game);
	}

	createAndJoinGame(client, config) {
		let game = new Game();
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
				break;
		}
		return game;
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
			client.leaveGame();
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
			let createdClient = new PlayerClientInterface(netClient);
			server.addClient(createdClient);
			let {id, name} = createdClient;
			PlayerClientInterface.sendToNetClient(netClient, {type: 'created-client', id, name});
			break;
		case 'change-client-name':
			if (client)
				client.name = message.name;
			break;
		case 'create-game':
			if (client) {
				let {id, name} = server.createAndJoinGame(client, message.config);
				PlayerClientInterface.sendToNetClient(netClient, {type: 'created-game', id, name});
			}
			break;
		case 'join-game':
			if (client && game)
				client.joinGame(game);
			break;
		case 'leave-game':
			if (client)
				client.leaveGame();
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
			let clientNames = game.clients.map(({name}) => name);
			ClientInterface.sendToClients(game.clients, {
				type: 'game',
				clientNames,
				data: inProgress && game.getStateDiff(),
				game: Server.getGameMessage(game),
			});
			if (inProgress)
				game.play();
		});
}, UPDATE_GAME_PERIOD_MS);

// todo fix not skipping turn if no moves left
