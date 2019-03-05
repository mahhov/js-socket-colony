const Game = require('../server/Game');
const Board = require('./Board');
const {GAME_STATE_ENUM} = require('../server/Constants');

class ColonyGame extends Game {
	constructor() {
		super(2);
		this.board = new Board();
		this.turn = 0;
		this.selected = {};
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

	get stateDiff() {
		return {
			width: this.board.width,
			height: this.board.height,
			tiles: this.board.tiles,
			turn: this.turn,
			elapsedTime: process.hrtime()[0] - this.startTime,
			selected: this.selected,
		};
	}
}

module.exports = ColonyGame;
