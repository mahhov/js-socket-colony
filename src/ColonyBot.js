const {randInt} = require('./server/Rand');
const Board = require('./Board');

class ColonyBot {
	play(board, tile, depth) {
		let moves = board.getPossibleMoves(tile);
		// todo if no moves at this depth
		let scoredMoves = moves
			.map(move => {
				let newBoard = ColonyBot.applyMove(board, move.from, move.to, tile);
				let score = this.scoreDeep(newBoard, tile, depth);
				return {score, move};
			});
		let maxScore = Math.max(...scoredMoves.map(({score}) => score));
		let maxScoreMoves = scoredMoves.filter(({score}) => score === maxScore);
		return maxScoreMoves[randInt(maxScoreMoves.length)];
	}

	static applyMove(board, from, to, tile) {
		let newBoard = Board.createFromTiles(board.tiles);
		newBoard.applyMove(from, to, tile);
		return newBoard;
	}

	scoreDeep(board, tile, depth) {
		if (!depth)
			return this.score(board, tile);
		return -this.play(board, 3 - tile, depth - 1).score;
	}

	score(board, tile) {
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

		return scores[tile] - scores[3 - tile];
	}
}

module.exports = ColonyBot;

// todo handle case with no possible moves
