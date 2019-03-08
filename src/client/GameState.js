class GameState {
	constructor() {
		this.resetData();
	}

	resetData() {
		/* override */
	}

	setData(data) {
		this.data = data;
	}

	draw(canvas, canvasCtx) {
		/* override */
	}

	getMouseTargetGeometry(canvas) {
		return {
			left: 0,
			top: 0,
			width: canvas.width,
			height: canvas.height,
		};
	}
}

module.exports = GameState;
