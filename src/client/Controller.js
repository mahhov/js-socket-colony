const Inputs = require('../server/Inputs');

class Controller {
	constructor(mouseTarget) {
		this.inputs = new Inputs();

		document.addEventListener('keydown', ({key, repeat}) =>
			!repeat && this.inputs.accumulateKeyInput({[key.toLowerCase()]: Inputs.INPUT_STATE.PRESSED}));

		document.addEventListener('keyup', ({key}) =>
			this.inputs.accumulateKeyInput({[key.toLowerCase()]: Inputs.INPUT_STATE.RELEASED}));

		mouseTarget.addEventListener('mousemove', ({offsetX, offsetY}) =>
			this.mouseInput(offsetX, offsetY));

		mouseTarget.addEventListener('mousedown', ({offsetX, offsetY}) => {
			this.mouseInput(offsetX, offsetY);
			this.inputs.accumulateKeyInput({mouse: Inputs.INPUT_STATE.PRESSED});
		});

		mouseTarget.addEventListener('mouseup', ({offsetX, offsetY}) => {
			this.mouseInput(offsetX, offsetY);
			this.inputs.accumulateKeyInput({mouse: Inputs.INPUT_STATE.RELEASED});
		});
	}

	setGeometry(geometry) {
		this.geometry = geometry;
	}

	mouseInput(x, y) {
		if (!this.geometry)
			return;
		let {left, top, width, height} = this.geometry;
		x = (x - left) / width;
		y = (y - top) / height;
		this.inputs.accumulateMouseInput({x, y});
	}
}

module.exports = Controller;
