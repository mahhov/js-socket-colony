const PromiseX = require('./PromiseX');
const Inputs = require('../server/Inputs');
const View = require('./View');

const SEND_INPUTS_PERIOD_MS = 1000 / 20;
const SERVER_URL = process.env.SERVER_WS_ENDPIONT;

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
		let textY1 = canvas.height - geometry.bottomPaneHeight + geometry.fontSize;
		let textY2 = textY1 + geometry.fontSize;

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
		canvasCtx.fillText(`blue: ${scores[0]}`, geometry.textMargin, textY1);
		canvasCtx.fillText(`green: ${scores[1]}`, geometry.textMargin, textY2);

		// turn
		let turnText = this.getTurnText();
		let turnTextLeft = canvas.width - geometry.textMargin - canvasCtx.measureText(turnText).width;
		canvasCtx.fillText(turnText, turnTextLeft, textY1);

		// elapsed time
		let time = this.data.elapsedTime;
		let timeText = `time ${parseInt(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
		let timeTextLeft = canvas.width - geometry.textMargin - canvasCtx.measureText(timeText).width;
		canvasCtx.fillText(timeText, timeTextLeft, textY2);
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
			[[220, 220, 220], [240, 240, 240]], // background
			[[91, 69, 115], [152, 137, 167]], // player 1, normal & light
			[[170, 165, 96], [247, 244, 200]]]; // player 2, normal & light
		return COLORS[tile][selected + 0]; // +0 to convert bool to int
	}
}

class Controller {
	constructor(mouseTarget) {
		document.addEventListener('keydown', ({key, repeat}) =>
			!repeat && inputs.accumulateKeyInput({[key.toLowerCase()]: Inputs.INPUT_STATE.PRESSED}));

		document.addEventListener('keyup', ({key}) =>
			inputs.accumulateKeyInput({[key.toLowerCase()]: Inputs.INPUT_STATE.RELEASED}));

		mouseTarget.addEventListener('mousemove', ({offsetX, offsetY}) =>
			Controller.mouseInput(offsetX, offsetY));

		mouseTarget.addEventListener('mousedown', ({offsetX, offsetY}) => {
			Controller.mouseInput(offsetX, offsetY);
			inputs.accumulateKeyInput({mouse: Inputs.INPUT_STATE.PRESSED});
		});

		mouseTarget.addEventListener('mouseup', ({offsetX, offsetY}) => {
			Controller.mouseInput(offsetX, offsetY);
			inputs.accumulateKeyInput({mouse: Inputs.INPUT_STATE.RELEASED});
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
				console.error(e);
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

let initView = () => {
	view.setTitle('JS Colony Online');

	let buttons = [[{
		id: "create-human-game-button",
		text: "play against human",
		handler: () => client.createGame({}),
	}, {
		id: "join-game-button",
		text: "join game",
		handler: selectedGameId => {
			if (selectedGameId)
				client.joinGame(selectedGameId);
		},
	}], [{
		id: "create-local-game-button",
		text: "play locally",
		handler: () => client.createGame({local: true}),
	}, {
		id: "create-bot-game-button",
		text: "play against bot",
		handler: () => client.createGame({bot: 1}),
	}, {
		id: "create-2-bot-game-button",
		text: "watch bot v bot",
		handler: () => client.createGame({bot: 2}),
	}]];

	view.setLobbyControlButtons(buttons);

	view.addUsernameChangeListener(name => client.requestUsernameChange(name));
	view.addLeaveGameListener(() => client.leaveGame());
};

initView();

window.addEventListener('load', () => client.createClient());

setInterval(() => client.gameInput(), SEND_INPUTS_PERIOD_MS);

// todo send input-game only if game started
// todo hover tile
// todo keep displaying lobby until games starts
