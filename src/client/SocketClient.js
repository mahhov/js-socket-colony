const PromiseX = require('./PromiseX');
const {GAME_STATE_ENUM} = require('../server/Constants');
const Inputs = require('../server/Inputs');

const SEND_INPUTS_PERIOD_MS = 1000 / 20;
const SERVER_URL = process.env.SERVER_WS_ENDPIONT;

// todo import these enums instead of duplicated definitions

const INPUT_STATE_ENUM = {
	RELEASED: 1,
	PRESSED: 2,
	TAPPED: 3
};

class View {
	constructor() {
		this.$ = query => document.querySelector(query);
		this.lobbyMode();
	}

	addUsernameChangeListener(listener) {
		this.$('#username-input').addEventListener('change', () =>
			listener(this.$('#username-input').value));
	}

	addCreateGameListener(listener) {
		this.$('#create-game-button').addEventListener('click', () => listener({bot: 0}));
		this.$('#create-bot-game-button').addEventListener('click', () => listener({bot: 1}));
		this.$('#create-2-bot-game-button').addEventListener('click', () => listener({bot: 2}));
	}

	addJoinGameListener(listener) {
		this.$('#join-game-button').addEventListener('click', () => {
			if ([...this.$('#game-list').children].some(gameItem => gameItem.gameId === this.selectedGameId))
				listener(this.selectedGameId)
		});
	}

	addLeaveGameListener(listener) {
		this.$('#leave-game-button').addEventListener('click', listener);
	}

	lobbyMode() {
		this.$('.lobby-container').hidden = false;
		this.$('.game-container').hidden = true;
		this.updateLobbySelected({gameId: null});
	}

	gameMode() {
		this.$('.lobby-container').hidden = true;
		this.$('.game-container').hidden = false;
	}

	setClientName(clientName) {
		this.$('#username-input').value = clientName;
	}

	updateLobby(population, clientNames, games) {
		this.$('#population-count-text').textContent = population;

		// todo extract client/game list logic to reusable helper
		let clientList = this.$('#client-list');
		for (let i = clientList.childElementCount; i < clientNames.length; i++) {
			let clientItem = document.createElement('div');
			clientItem.classList.add('client-item');
			clientItem.addEventListener('click', () =>
				this.updateLobbySelected(clientItem));
			clientList.appendChild(clientItem)
		}
		while (clientList.childElementCount > clientNames.length)
			clientList.lastChild.remove();

		clientNames.forEach((name, i) => {
			let clientItem = clientList.children[i];
			clientItem.textContent = name;
		});

		let gameList = this.$('#game-list');
		for (let i = gameList.childElementCount; i < games.length; i++) {
			let gameItem = document.createElement('div');
			gameItem.classList.add('game-item');
			gameItem.addEventListener('click', () =>
				this.updateLobbySelected(gameItem));
			gameList.appendChild(gameItem)
		}
		while (gameList.childElementCount > games.length)
			gameList.lastChild.remove();

		games.forEach(({id, name, state, population}, i) => {
			let gameItem = gameList.children[i];
			gameItem.gameId = id;
			gameItem.textContent = `${name}: ${View.getGameStateText(state)} (${population} / ${2} players)`; // todo don't hardcode 2
		});
	};

	updateLobbySelected(selectedGameItem) {
		this.selectedGameId = selectedGameItem.gameId;
		[...this.$('#game-list').children].forEach(gameItem =>
			gameItem.classList.toggle('selected', gameItem === selectedGameItem));
	}

	updateGame(name, state) {
		this.$('#game-name').textContent = name;
		this.$('#game-state').textContent = View.getGameStateText(state);
	}

	static getGameStateText(state) {
		switch (state) {
			case GAME_STATE_ENUM.WAITING_FOR_PLAYERS:
				return 'waiting for players';
			case GAME_STATE_ENUM.IN_PROGRESS:
				return 'game in progress';
			case GAME_STATE_ENUM.ABANDONED:
				return 'game abandoned';
			case GAME_STATE_ENUM.ENDED:
				return 'game ended';
			default:
				console.warn('unrecognized game state:', state);
		}
	}
}

class GameState {
	constructor() {
		this.resetData();
	}

	resetData() {
		this.data = {width: 0, height: 0, tiles: []};
	}

	setData(data) {
		this.data = data;
	}

	draw() {
		let geometry = this.getDrawGeometry();

		// clear
		canvasCtx.fillStyle = 'rgb(0, 0, 0)';
		canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

		// board
		this.drawBoard(geometry.boardLeft, geometry.boardTop, geometry.boardTileSize);

		// prepare bottom panel
		canvasCtx.fillStyle = 'rgb(100, 100, 100)';
		canvasCtx.fillRect(0, canvas.height - geometry.bottomPaneHeight, canvas.width, geometry.bottomPaneHeight);
		canvasCtx.fillStyle = 'rgb(255, 255, 255)';
		canvasCtx.font = `${geometry.fontSize}px monospace`;

		// scores
		let scores = this.getScores();
		canvasCtx.fillText(`blue: ${scores[0]}`, geometry.textMargin, canvas.height - geometry.bottomPaneHeight + geometry.fontSize);
		canvasCtx.fillText(`green: ${scores[1]}`, geometry.textMargin, canvas.height - geometry.bottomPaneHeight + geometry.fontSize * 2);

		// turn
		let turnText = this.getTurnText();
		let turnTextLeft = canvas.width - geometry.textMargin - canvasCtx.measureText(turnText).width;
		canvasCtx.fillText(turnText, turnTextLeft, canvas.height - geometry.bottomPaneHeight + geometry.fontSize);
	}

	getScores() {
		let flatTiles = this.data.tiles.flat();
		return [
			flatTiles.filter(a => a === 1).length,
			flatTiles.filter(a => a === 2).length];
	}

	getTurnText() {
		return ['blue', 'green'][this.data.turn] + "'s turn";
	}

	drawBoard(left, top, tileSize) {
		for (let x = 0; x < this.data.width; x++)
			for (let y = 0; y < this.data.height; y++) {
				let tile = this.data.tiles[x][y];
				let selected = tile ?
					x === this.data.selected.x && y === this.data.selected.y :
					(x + y) % 2;
				let color = GameState.getColor(tile, selected);
				canvasCtx.fillStyle = `rgb(${color})`;
				canvasCtx.fillRect(x * tileSize + left, y * tileSize + top, tileSize, tileSize);
			}
	}

	getDrawGeometry() {
		// todo cache once game width/height are set
		let fontSize = 24;
		let bottomPaneHeight = fontSize * 2 + 10;
		let textMargin = 50;

		let maxBoardLeft = 0;
		let maxBoardTop = 10;
		let maxBoardWidth = canvas.width;
		let maxBoardHeight = canvas.height - bottomPaneHeight - 20;

		let boardTileSize = Math.min(maxBoardWidth / this.data.width, maxBoardHeight / this.data.height);
		let boardLeft = maxBoardLeft + (maxBoardWidth - this.data.width * boardTileSize) / 2;
		let boardTop = maxBoardTop + (maxBoardHeight - this.data.height * boardTileSize) / 2;
		let boardWidth = this.data.width * boardTileSize;
		let boardHeight = this.data.height * boardTileSize;

		return {
			fontSize,
			bottomPaneHeight,
			textMargin,
			maxBoardLeft,
			maxBoardTop,
			maxBoardWidth,
			maxBoardHeight,
			boardTileSize,
			boardLeft,
			boardTop,
			boardWidth,
			boardHeight,
		};
	}

	static getColor(tile, selected) {
		const COLORS = [
			[[200, 200, 200], [230, 230, 230]], // background
			[[91, 69, 115], [152, 137, 167]], // player 1, normal & light
			[[170, 165, 96], [247, 244, 200]]]; // player 2, normal & light
		return COLORS[tile][selected + 0]; // +0 to convert bool to int
	}
}

class Controller {
	constructor(mouseTarget) {
		document.addEventListener('keydown', ({key, repeat}) =>
			!repeat && inputs.accumulateKeyInput({[key.toLowerCase()]: INPUT_STATE_ENUM.PRESSED}));

		document.addEventListener('keyup', ({key}) =>
			inputs.accumulateKeyInput({[key.toLowerCase()]: INPUT_STATE_ENUM.RELEASED}));

		mouseTarget.addEventListener('mousemove', ({offsetX, offsetY}) =>
			Controller.mouseInput(offsetX, offsetY));

		mouseTarget.addEventListener('mousedown', ({offsetX, offsetY}) => {
			Controller.mouseInput(offsetX, offsetY);
			inputs.accumulateKeyInput({mouse: INPUT_STATE_ENUM.PRESSED});
		});

		mouseTarget.addEventListener('mouseup', ({offsetX, offsetY}) => {
			Controller.mouseInput(offsetX, offsetY);
			inputs.accumulateKeyInput({mouse: INPUT_STATE_ENUM.RELEASED});
		});
	}

	static mouseInput(x, y) {
		// todo should not be directly accessing gameState
		let {boardLeft, boardTop, boardTileSize, boardWidth, boardHeight} = gameState.getDrawGeometry();
		x = (x - boardLeft) / boardWidth;
		y = (y - boardTop) / boardHeight;
		inputs.accumulateMouseInput({x, y});
	}
}

class NetClient {
	constructor(serverUrl, messageHandler) {
		this.opened = new PromiseX();
		this.serverSocket = new WebSocket(serverUrl);
		this.serverSocket.addEventListener('open', () => this.opened.resolve());
		this.serverSocket.addEventListener('message', ({data}) => {
			try {
				messageHandler(JSON.parse(data));
			} catch (e) {
			}
		});
	}

	async send(data) {
		let stringData = JSON.stringify(data);
		await this.opened;
		this.serverSocket.send(stringData);
	}
}

class Client {
	constructor() {
		this.clientId = null;
		this.gameId = null;
	}

	createClient() {
		netClient.send({type: 'create-client'});
	}

	setClient(id, name) {
		this.clientId = id;
		view.setClientName(name);
	}

	requestUsernameChange(name) {
		netClient.send({
			type: 'change-client-name',
			clientId: this.clientId,
			name,
		});
	}

	createGame(config) {
		netClient.send({
			type: 'create-game',
			clientId: this.clientId,
			config,
		});
	}

	joinGame(gameId) {
		netClient.send({
			type: 'join-game',
			clientId: this.clientId,
			gameId,
		});
		this.setGame(gameId);
	}

	setGame(gameId) {
		this.gameId = gameId;
		gameState.resetData();
		view.gameMode();
	}

	leaveGame() {
		netClient.send({
			type: 'leave-game',
			clientId: this.clientId,
		});
		this.gameId = null;
		view.lobbyMode();
	}

	updateLobby(population, clientNames, games) {
		view.updateLobby(population, clientNames, games);
	}

	updateGame(data, game) {
		if (data)
			gameState.setData(data);
		gameState.draw();
		view.updateGame(game.name, game.state);
	}

	gameInput() {
		if (this.gameId)
			netClient.send({
				type: 'input-game',
				clientId: this.clientId,
				gameId: this.gameId,
				input: inputs.getAccumulatedInputs(),
			});
	}
}

let canvas = document.querySelector('canvas');
let canvasCtx = canvas.getContext('2d');
let gameState = new GameState();
let inputs = new Inputs();
let controller = new Controller(canvas);
let view = new View();
let client = new Client();
let netClient = new NetClient(SERVER_URL, message => {
	switch (message.type) {
		case 'created-client':
			client.setClient(message.id, message.name);
			break;
		case 'created-game':
			client.setGame(message.id);
			break;
		case 'lobby':
			client.updateLobby(message.population, message.clientNames, message.games);
			break;
		case 'game':
			client.updateGame(message.data, message.game);
			break;
		default:
			console.warn('unrecognized message type:', message.type);
	}
});

view.addUsernameChangeListener(name => client.requestUsernameChange(name));
view.addCreateGameListener(config => client.createGame(config));
view.addJoinGameListener(gameId => client.joinGame(gameId));
view.addLeaveGameListener(() => client.leaveGame());

window.addEventListener('load', () => client.createClient());

setInterval(() => client.gameInput(), SEND_INPUTS_PERIOD_MS);

// todo send input-game only if game started
// todo hover tile
// todo keep displaying lobby until games starts
// todo gmae timer
// todo board colors
// todo play 1 computer 2 players
// todo send update after play()
