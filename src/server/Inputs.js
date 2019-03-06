const KEY_STATE_ENUM = {
	UP: 0,
	DOWN: 1,
	PRESSED: 2,
	TAPPED: 3,
};

const INPUT_STATE_ENUM = {
	RELEASED: 1,
	PRESSED: 2,
	TAPPED: 3
};

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
		return this.keys[key] === KEY_STATE_ENUM.PRESSED || this.keys[key] === KEY_STATE_ENUM.TAPPED
	}

	accumulateInput(input) {
		this.accumulateKeyInput(input.keys);
		this.accumulateMouseInput(input.mouse);
	}

	accumulateKeyInput(keyInput) {
		Object.entries(keyInput).forEach(([key, value]) => {
			if (value !== INPUT_STATE_ENUM.RELEASED)
				this.accumulatedInputs.keys[key] = value;

			// null -> release
			// release -> release
			// pressed -> tapped
			// tapped -> tapped
			else if (this.accumulatedInputs.keys[key] === INPUT_STATE_ENUM.PRESSED)
				this.accumulatedInputs.keys[key] = INPUT_STATE_ENUM.TAPPED;
			else if (!this.accumulatedInputs.keys[key])
				this.accumulatedInputs.keys[key] = INPUT_STATE_ENUM.RELEASED;
		});
	}

	accumulateMouseInput(mouseInput) {
		if (mouseInput.x && mouseInput.y)
			this.accumulatedInputs.mouse = mouseInput;
	}

	applyAccumulatedInputs() {
		// age keys
		Object.entries(this.keys).forEach(([key, value]) => {
			if (value === KEY_STATE_ENUM.PRESSED)
				this.keys[key] = KEY_STATE_ENUM.DOWN;
			else if (value === KEY_STATE_ENUM.TAPPED)
				this.keys[key] = KEY_STATE_ENUM.UP;
		});

		// apply accumulatedInputs to keys
		Object.entries(this.accumulatedInputs.keys).forEach(([key, value]) => {
			switch (value) {
				case INPUT_STATE_ENUM.RELEASED:
					this.keys[key] = KEY_STATE_ENUM.UP;
					break;
				case INPUT_STATE_ENUM.PRESSED:
					if (this.keys[key] !== KEY_STATE_ENUM.DOWN)
						this.keys[key] = KEY_STATE_ENUM.PRESSED;
					break;
				case INPUT_STATE_ENUM.TAPPED:
					this.keys[key] = KEY_STATE_ENUM.TAPPED;
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

module.exports = Inputs;
