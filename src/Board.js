class Board {
	constructor(width = 10, height = 10) {
		this.width = width;
		this.height = height;
		this.tiles = Array(width).fill().map(() => Array(height).fill(0));
		this.tiles[0][0] = 1;
		this.tiles[width - 1][height - 1] = 2;
	}

	static createClone(board) {
		let clonedBoard = new Board(board.width, board.height);
		let clonedTiles = [];
		board.tiles.forEach(tileColumn => clonedTiles.push([...tileColumn]));
		clonedBoard.tiles = clonedTiles;
		return clonedBoard;
	}

	applyMove(from, to, tile) {
		this.propagate(to, tile);
		if (from)
			this.remove(from);
	}

	propagate(point, tile) {
		for (let x = point.x - 1; x <= point.x + 1; x++)
			for (let y = point.y - 1; y <= point.y + 1; y++)
				if (this.inBounds(x, y) && this.tiles[x][y])
					this.tiles[x][y] = tile;
		this.tiles[point.x][point.y] = tile
	}

	remove(point) {
		this.tiles[point.x][point.y] = 0;
	}

	getNearbyInBoundsOfTile(board, x, y, dist, tile) {
		return Board
			.getNearby(x, y, dist)
			.filter(({x, y}) => this.inBounds(x, y))
			.filter(({x, y}) => board[x][y] === tile);
	}

	inBounds(x, y) {
		return x >= 0 && x < this.width && y >= 0 && y < this.height;
	}

	static areNear(p1, p2, dist) {
		return Math.abs(p1.x - p2.x) <= dist && Math.abs(p1.y - p2.y) <= dist;
	}

	static getNearby(x, y, dist) {
		let nearby = [];
		for (let i = -dist; i < dist; i++) {
			nearby.push({x: x + i, y: y - dist}); // top
			nearby.push({x: x + dist, y: y + i}); // right
			nearby.push({x: x - i, y: y + dist}); // bottom
			nearby.push({x: x - dist, y: y - i}); // left
		}
		return nearby;
	}
}

module.exports = Board;
