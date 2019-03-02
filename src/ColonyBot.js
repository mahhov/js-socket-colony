const {randInt} = require('./server/Rand');
const Board = require('./Board');

class ColonyBot {
	static play(board, tile, depth) {
		let scoredMoves = board.getPossibleMoves(tile)
			.map(move => {
				let newBoard = ColonyBot.applyMove(board, move.from, move.to, tile);
				let score = ColonyBot.scoreDeep(newBoard, tile, depth);
				return {score, move};
			});
		if (!scoredMoves.length)
			return {score: ColonyBot.scoreDeep(board, tile, depth)};
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
		return ColonyBot.scoreCounts(board, tile);
		// todo configurable bot for game
	}

	// simply counts tiles per player
	static scoreCounts(board, tile) {
		let counts = [0, 0, 0];
		for (let x = 0; x < board.width; x++)
			for (let y = 0; y < board.height; y++)
				counts[board.tiles[x][y]]++;
		return counts[tile] - counts[3 - tile];
	}

	// penalizes for empty tiles of big-loss, i.e., opponent makes a move that causes tile to lose 6 count
	static scoreVulnerability(board, tile) {
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
	}

	// penalizes tiles surrounded by empty tiles
	static scorePointsOfAttackMult(board, tile) {
		let score = [0, 0, 0];

		for (let x = 0; x < board.width; x++)
			for (let y = 0; y < board.height; y++)
				if (board.tiles[x][y]) {
					let pointsOfAttack = board.getNearbyInBoundsOfTile(x, y, 1, 0);
					score[board.tiles[x][y]] += 1 / (pointsOfAttack.length + 1);
				}

		return score[tile] - score[3 - tile];
	}

	// penalizes tiles surrounded by empty tiles
	static scorePointsOfAttackFlat(board, tile) {
		let score = [0, 0, 0];

		for (let x = 0; x < board.width; x++)
			for (let y = 0; y < board.height; y++)
				if (board.tiles[x][y]) {
					let pointsOfAttack = board.getNearbyInBoundsOfTile(x, y, 1, 0);
					score[board.tiles[x][y]] += 10 - pointsOfAttack.length;
				}

		return score[tile] - score[3 - tile];
	}

	// penalizes tiles part of a potential big loss; i.e., if the opponent can make a move that takes 6 points, those 6 points are penalized
	static scoreRisk(board, tile) {
		let score = [0, 0, 0];

		for (let x = 0; x < board.width; x++)
			for (let y = 0; y < board.height; y++) {
				let t = board.tiles[x][y];
				if (t) {
					let losses = board.getNearbyInBoundsOfTile(x, y, 1, 0)
						.map(({x, y}) => board.getNearbyInBoundsOfTile(x, y, 1, t).length);
					let maxLoss = Math.max(...losses);
					score[t] += 1 / (maxLoss + 5);
				}
			}

		return score[tile] - score[3 - tile];
	}
}

module.exports = ColonyBot;
