const {randInt} = require('./server/Rand');

class ColonyBot {
	initialize(width, height, tile) {
		this.width = width;
		this.height = height;
		this.tile = tile
	}

	play(board) {
		let scoredMoves = this.getPossibleMoves_(board)
			.map(move => {
				let newBoard = this.applyMove_(board, move);
				let score = this.score_(newBoard);
				return {score, move};
			});
		let maxScore = Math.max(...scoredMoves.map(({score}) => score));
		console.log('scored moves', scoredMoves.length, scoredMoves)
		console.log('max score', maxScore)
		let maxScoreMoves = scoredMoves.filter(({score}) => score === maxScore);
		console.log('maxScoreMoves', maxScoreMoves.length, maxScoreMoves)
		return maxScoreMoves[randInt(maxScoreMoves.length)];
	}

	getPossibleMoves_(board) {
		let moves = [];
		for (let x = 0; x < board.length; x++)
			for (let y = 0; y < board[x].length; y++) {
				if (board[x][y] === 0) {
					let nearbyOwned = this.getNearbyInBoundsOfTile(board, x, y, 1, this.tile);
					if (nearbyOwned.length)
						moves.push({to: {x, y}});
				} else if (board[x][y] === this.tile)
					moves.push(
						this.getNearbyInBoundsOfTile(board, x, y, 2, 0)
							.map(to => ({from: {x, y}, to})));
			}
		return moves.flat();
	}

	applyMove_(board, {from, to}) {
		let newBoard = [];
		board.forEach(boardColumn => newBoard.push([...boardColumn]));

		if (from)
			newBoard[from.x][from.y] = 0;
		newBoard[to.x][to.y] = this.tile;
		// todo propogate

		return newBoard;
	}

	score_(board) {
		let counts = [0, 0, 0].map((_, i) =>
			board
				.flat(2)
				.filter(a => a === i)
				.length);

		let vulnerabilities = [0, 0, 0].map(() => new Array(9).fill(0));
		for (let x = 0; x < board.length; x++)
			for (let y = 0; y < board[x].length; y++) {
				[0, 0, 0].map((_, i) =>
					this.getNearbyInBoundsOfTile(board, x, y, 1, i).length)
					.forEach((vulnerability, tile) => vulnerabilities[tile][vulnerability]++);
			}

		// todo consider vulnerabilities

		return counts[this.tile];
	}

	getNearbyInBoundsOfTile(board, x, y, dist, tile) {
		return ColonyBot
			.getNearby_(x, y, dist)
			.filter(({x, y}) => this.inBounds(x, y))
			.filter(({x, y}) => board[x][y] === tile);
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

module.exports = ColonyBot;
