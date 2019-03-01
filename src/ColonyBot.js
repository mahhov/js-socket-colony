const {randInt} = require('./server/Rand');
const Board = require('./Board');

class ColonyBot {
	constructor(tiles, tile) {
		this.board = Board.createFromTiles(tiles);
		this.tile = tile;
	}

	play() {
		let scoredMoves = this.board.getPossibleMoves()
			.map(move => {
				let newBoard = this.applyMove(move.from, move.to);
				let score = this.score(newBoard);
				return {score, move};
			});
		let maxScore = Math.max(...scoredMoves.map(({score}) => score));
		let maxScoreMoves = scoredMoves.filter(({score}) => score === maxScore);
		return maxScoreMoves[randInt(maxScoreMoves.length)];
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
			for (let y = 0; y < board.height; y++)
				if (!board.tiles[x][y])
					for (let tile = 0; tile < 3; tile++) {
						let vulnerability = board.getNearbyInBoundsOfTile(x, y, 1, tile).length;
						vulnerabilities[tile][vulnerability]++;
					}

		const VULNERABILITY_WEIGHTS = [0, 0, 0, 0, 5 * 5 / 8, 6 * 6 / 8, 12, 7 * 7 / 8, 8];
		let vulnerabilityScores = vulnerabilities.map(vulnerabilities =>
			VULNERABILITY_WEIGHTS.reduce((score, weight, i) => score + weight * vulnerabilities[i], 0));

		let scores = counts.map((count, i) => count * 5 - vulnerabilityScores[i]);

		return scores[this.tile] - scores[3 - this.tile];
	}
}

module.exports = ColonyBot;

// todo handle case with no possible moves
