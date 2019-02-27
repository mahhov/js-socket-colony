class ColonyBot {
	initialize(width, height, tile) {
		this.width = width;
		this.height = height;
		this.tile = tile
	}

	play(board) {
		return this.getPossibleMoves_(board)
			.map(move => {
				let newBoard = this.applyMove_(board, move);
				let score = this.score_(newBoard);
				return {score, moev};
			})
			.sort(({score: score1}, {score: score2}) => score2 - score1)[0];
	}


	getPossibleMoves_(board) {
		let moves = [];
		for (let x = 0; x < board.length; x++)
			for (let y = 0; y < board[x].length; y++) {
				if (board[x][y] === 0) {
					let canCopy = ColonyBot
						.getNearby_(x, y, 1)
						.some(({x, y}) => this.inBounds(x, y) && board[x][y] === this.tile);
					if (canCopy)
						moves.push({to: {x, y}});
				} else if (board[x][y] === this.tile)
					this.moves.push(ColonyBot
						.getNearby_(x, y, 2)
						.filter(({x, y}) => board[x][y] === 0)
						.map(from => ({from, to: {x, y}})));
			}

		return moves.flat();
	}

	applyMove_(board, {from, to}) {
		let newBoard = [];
		board.forEach(boardColumn => newBoard.push([...boardColumn]));

		if (from)
			board[from.x][from.y] = 0;
		board[to.x][to.y] = this.tile;

		return newBoard;
	}

	score_(board) {
		let counts = [0, 0, 0].map(tile =>
			board
				.flat(2)
				.filter(a => a === tile)
				.length);

		return counts[this.tile];
	}

	static getNearby_(x, y, dist) {
		let nearby = [];
		for (let i = -dist; i < dist; i++) {
			nearby.push({x: x + i, y: y - dist}); // top
			nearby.push({x: x + dist, y: y + i}); // right
			nearby.push({x: x - i, y: y + dist}); // bottom
			nearby.push({x: x - dist, y: y - i}); // left
		}
		return nearby;
	}

	inBounds(x, y) {
		return x >= 0 && x < this.width && y >= 0 && y < this.height;
	}
}

class ColonyBotClient {
	constructor(inputSink, game){
		this.inputSink = inputSink;
		this.game = game;
	}


}

module.exports = ColonyBot;
