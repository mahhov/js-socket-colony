class Inputs {
	constructor() {
		this.keys = {};
		this.mouse = {};
		this.resetAccumulatedInputs();
	}

	resetAccumulatedInputs() {
		this.accumulatedInputs = {
			keys: {},
			mouse: {},
		};
	}

	isDown(key) {
		return !!this.keys[key];
	}

	isTriggered(key) {
		return this.keys[key] === Inputs.KEY_STATE.PRESSED || this.keys[key] === Inputs.KEY_STATE.TAPPED
	}

	accumulateInput(input) {
		this.accumulateKeyInput(input.keys);
		this.accumulateMouseInput(input.mouse);
	}

	accumulateKeyInput(keyInput) {
		Object.entries(keyInput).forEach(([key, value]) => {
			if (value !== Inputs.INPUT_STATE.RELEASED)
				this.accumulatedInputs.keys[key] = value;

			// null -> release
			// release -> release
			// pressed -> tapped
			// tapped -> tapped
			else if (this.accumulatedInputs.keys[key] === Inputs.INPUT_STATE.PRESSED)
				this.accumulatedInputs.keys[key] = Inputs.INPUT_STATE.TAPPED;
			else if (!this.accumulatedInputs.keys[key])
				this.accumulatedInputs.keys[key] = Inputs.INPUT_STATE.RELEASED;
		});
	}

	accumulateMouseInput(mouseInput) {
		if (mouseInput.x && mouseInput.y)
			this.accumulatedInputs.mouse = mouseInput;
	}

	applyAccumulatedInputs() {
		// age keys
		Object.entries(this.keys).forEach(([key, value]) => {
			if (value === Inputs.KEY_STATE.PRESSED)
				this.keys[key] = Inputs.KEY_STATE.DOWN;
			else if (value === Inputs.KEY_STATE.TAPPED)
				this.keys[key] = Inputs.KEY_STATE.UP;
		});

		// apply accumulatedInputs to keys
		Object.entries(this.accumulatedInputs.keys).forEach(([key, value]) => {
			switch (value) {
				case Inputs.INPUT_STATE.RELEASED:
					this.keys[key] = Inputs.KEY_STATE.UP;
					break;
				case Inputs.INPUT_STATE.PRESSED:
					if (this.keys[key] !== Inputs.KEY_STATE.DOWN)
						this.keys[key] = Inputs.KEY_STATE.PRESSED;
					break;
				case Inputs.INPUT_STATE.TAPPED:
					this.keys[key] = Inputs.KEY_STATE.TAPPED;
					break;

			}
		});

		// update mouse
		if (this.accumulatedInputs.mouse)
			this.mouse = this.accumulatedInputs.mouse;

		this.resetAccumulatedInputs();
	}

	getAccumulatedInputs() {
		let accumulatedInputs = this.accumulatedInputs;
		this.resetAccumulatedInputs();
		return accumulatedInputs;
	}
}

Inputs.KEY_STATE = {
	UP: 0,
	DOWN: 1,
	PRESSED: 2,
	TAPPED: 3,
};

Inputs.INPUT_STATE = {
	RELEASED: 1,
	PRESSED: 2,
	TAPPED: 3
};

module.exports = Inputs;
