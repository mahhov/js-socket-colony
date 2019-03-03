class Board {
	constructor(width = 8, height = 8) {
		this.width = width;
		this.height = height;
		this.tiles = Array(width).fill().map(() => Array(height).fill(0));
		this.tiles[0][0] = 1;
		this.tiles[width - 1][height - 1] = 2;
	}

	static createFromTiles(tiles) {
		let board = new Board(tiles.length, tiles[0].length);
		board.tiles = [];
		tiles.forEach(tileColumn => board.tiles.push([...tileColumn]));
		return board;
	}

	applyMove(from, to, tile) {
		let dist = Board.dist(from, to);
		if (isNaN(dist) || dist > 2 || dist === 0 || this.tiles[from.x][from.y] !== tile || this.tiles[to.x][to.y])
			return;
		this.propagate(to, tile);
		if (dist === 2)
			this.remove(from);
		return true;
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

	getPossibleMoves(tile) {
		let moves = [];
		for (let x = 0; x < this.width; x++)
			for (let y = 0; y < this.height; y++) {
				if (this.tiles[x][y] === 0) {
					let nearbyOwned = this.getNearbyInBoundsOfTile(x, y, 1, tile);
					if (nearbyOwned.length)
						moves.push({from: nearbyOwned[0], to: {x, y}});
				} else if (this.tiles[x][y] === tile)
					moves.push(
						this.getNearbyInBoundsOfTile(x, y, 2, 0)
							.map(to => ({from: {x, y}, to})));
			}
		return moves.flat();
	}

	getNearbyInBoundsOfTile(x, y, dist, tile) {
		return Board
			.getNearby(x, y, dist)
			.filter(({x, y}) => this.inBounds(x, y))
			.filter(({x, y}) => this.tiles[x][y] === tile);
	}

	inBounds(x, y) {
		return x >= 0 && x < this.width && y >= 0 && y < this.height;
	}

	static dist(p1, p2) {
		return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
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
