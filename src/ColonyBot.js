const {randInt} = require('./server/Rand');
const Board = require('./Board');

class ColonyBot {
	constructor(tiles, tile) {
		this.board = Board.createFromTiles(tiles);
		this.tile = tile;
	}

	play() {
		let scoredMoves = this.getPossibleMoves_()
			.map(move => {
				let newBoard = this.applyMove(move.from, move.to);
				let score = this.score(newBoard);
				return {score, move};
			});
		let maxScore = Math.max(...scoredMoves.map(({score}) => score));
		console.log('scored moves', scoredMoves.length, scoredMoves)
		console.log('max score', maxScore)
		let maxScoreMoves = scoredMoves.filter(({score}) => score === maxScore);
		console.log('maxScoreMoves', maxScoreMoves.length, maxScoreMoves)
		return maxScoreMoves[randInt(maxScoreMoves.length)];
	}

	getPossibleMoves_() {
		let moves = [];
		for (let x = 0; x < this.board.width; x++)
			for (let y = 0; y < this.board.height; y++) {
				if (this.board.tiles[x][y] === 0) {
					let nearbyOwned = this.board.getNearbyInBoundsOfTile(x, y, 1, this.tile);
					if (nearbyOwned.length)
						moves.push({from: nearbyOwned[0], to: {x, y}});
				} else if (this.board.tiles[x][y] === this.tile)
					moves.push(
						this.board.getNearbyInBoundsOfTile(x, y, 2, 0)
							.map(to => ({from: {x, y}, to})));
			}
		console.log('>> moves', moves.flat().length, moves.flat())
		return moves.flat();
	}

	applyMove(from, to) {
		let newBoard = Board.createFromTiles(this.board.tiles);
		newBoard.applyMove(from, to, this.tile);
		return newBoard;
	}

	score(board) {
		let counts = [0, 0, 0].map((_, i) =>
			board.tiles
				.flat(2)
				.filter(a => a === i)
				.length);

		let vulnerabilities = [0, 0, 0].map(() => new Array(9).fill(0));
		for (let x = 0; x < board.width; x++)
			for (let y = 0; y < board.height; y++) {
				[0, 0, 0].map((_, i) =>
					board.getNearbyInBoundsOfTile(x, y, 1, i).length)
					.forEach((vulnerability, tile) => vulnerabilities[tile][vulnerability]++);
			}

		// todo consider vulnerabilities (or dont for easy bot)

		return counts[this.tile];
	}
}

module.exports = ColonyBot;

// todo handle case with no possible moves
