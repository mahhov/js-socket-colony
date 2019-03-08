const GameState = require('../client/GameState');

class ColonyGameState extends GameState {
	resetData() {
		this.data = {width: 0, height: 0, tiles: []};
	}

	draw(canvas, canvasCtx) {
		let geometry = this.getDrawGeometry(canvas);
		let textY1 = canvas.height - geometry.bottomPaneHeight + geometry.fontSize;
		let textY2 = textY1 + geometry.fontSize;

		// clear
		canvasCtx.fillStyle = 'rgb(0, 0, 0)';
		canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

		// board
		this.drawBoard(canvasCtx, geometry.boardLeft, geometry.boardTop, geometry.boardTileSize);

		// prepare bottom panel
		canvasCtx.fillStyle = 'rgb(100, 100, 100)';
		canvasCtx.fillRect(0, canvas.height - geometry.bottomPaneHeight, canvas.width, geometry.bottomPaneHeight);
		canvasCtx.fillStyle = 'rgb(255, 255, 255)';
		canvasCtx.font = `${geometry.fontSize}px monospace`;

		// scores
		let scores = this.getScores();
		canvasCtx.fillText(`blue: ${scores[0]}`, geometry.textMargin, textY1);
		canvasCtx.fillText(`green: ${scores[1]}`, geometry.textMargin, textY2);

		// turn
		let turnText = this.getTurnText();
		let turnTextLeft = canvas.width - geometry.textMargin - canvasCtx.measureText(turnText).width;
		canvasCtx.fillText(turnText, turnTextLeft, textY1);

		// elapsed time
		let time = this.data.elapsedTime;
		let timeText = `time ${parseInt(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
		let timeTextLeft = canvas.width - geometry.textMargin - canvasCtx.measureText(timeText).width;
		canvasCtx.fillText(timeText, timeTextLeft, textY2);
	}

	getScores() {
		let flatTiles = this.data.tiles.flat();
		return [
			flatTiles.filter(a => a === 1).length,
			flatTiles.filter(a => a === 2).length];
	}

	getTurnText() {
		return ['blue', 'green'][this.data.turn] + "'s turn";
	}

	drawBoard(canvasCtx, left, top, tileSize) {
		for (let x = 0; x < this.data.width; x++)
			for (let y = 0; y < this.data.height; y++) {
				let tile = this.data.tiles[x][y];
				let selected = tile ?
					x === this.data.selected.x && y === this.data.selected.y :
					(x + y) % 2;
				let color = ColonyGameState.getColor(tile, selected);
				canvasCtx.fillStyle = `rgb(${color})`;
				canvasCtx.fillRect(x * tileSize + left, y * tileSize + top, tileSize, tileSize);
			}
	}

	getDrawGeometry(canvas) {
		// todo cache once game width/height are set
		let fontSize = 24;
		let bottomPaneHeight = fontSize * 2 + 10;
		let textMargin = 50;

		let maxBoardLeft = 0;
		let maxBoardTop = 10;
		let maxBoardWidth = canvas.width;
		let maxBoardHeight = canvas.height - bottomPaneHeight - 20;

		let boardTileSize = Math.min(maxBoardWidth / this.data.width, maxBoardHeight / this.data.height);
		let boardLeft = maxBoardLeft + (maxBoardWidth - this.data.width * boardTileSize) / 2;
		let boardTop = maxBoardTop + (maxBoardHeight - this.data.height * boardTileSize) / 2;
		let boardWidth = this.data.width * boardTileSize;
		let boardHeight = this.data.height * boardTileSize;

		return {
			fontSize,
			bottomPaneHeight,
			textMargin,
			maxBoardLeft,
			maxBoardTop,
			maxBoardWidth,
			maxBoardHeight,
			boardTileSize,
			boardLeft,
			boardTop,
			boardWidth,
			boardHeight,
		};
	}

	getMouseTargetGeometry(canvas) {
		let drawGeometry = this.getDrawGeometry(canvas);
		return {
			left: drawGeometry.boardLeft,
			top: drawGeometry.boardTop,
			width: drawGeometry.boardWidth,
			height: drawGeometry.boardHeight,
		};
	}

	static getColor(tile, selected) {
		const COLORS = [
			[[220, 220, 220], [240, 240, 240]], // background
			[[91, 69, 115], [152, 137, 167]], // player 1, normal & light
			[[170, 165, 96], [247, 244, 200]]]; // player 2, normal & light
		return COLORS[tile][selected + 0]; // +0 to convert bool to int
	}
}

module.exports = ColonyGameState;
