const {randInt} = require('./server/Rand');
const Board = require('./Board');

class ColonyBot {
	static play(board, tile, depth) {
		let moves = board.getPossibleMoves(tile);
		// todo if no moves at this depth
		let scoredMoves = moves
			.map(move => {
				let newBoard = ColonyBot.applyMove(board, move.from, move.to, tile);
				let score = ColonyBot.scoreDeep(newBoard, tile, depth);
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

	static scoreDeep(board, tile, depth) {
		if (!depth)
			return ColonyBot.score(board, tile);
		return -ColonyBot.play(board, 3 - tile, depth - 1).score;
	}

	static score(board, tile) {
		let score = [0, 0, 0];
		const VULNERABILITY_WEIGHTS = [0, 0, 0, 0, 5 * 5 / 8, 6 * 6 / 8, 12, 7 * 7 / 8, 8];

		for (let x = 0; x < board.width; x++)
			for (let y = 0; y < board.height; y++)
				if (!board.tiles[x][y])
					for (let tile = 1; tile < 3; tile++) {
						let vulnerability = board.getNearbyInBoundsOfTile(x, y, 1, tile).length;
						score[tile] -= VULNERABILITY_WEIGHTS[vulnerability];
					}
				else
					score[board.tiles[x][y]]++;

		return score[tile] - score[3 - tile];

		// let counts = [0, 0, 0];
		// for (let x = 0; x < board.width; x++)
		// 	for (let y = 0; y < board.height; y++)
		// 		counts[board.tiles[x][y]]++;
		// return counts[tile] - counts[3 - tile];
	}
}

module.exports = ColonyBot;

// todo handle case with no possible moves
