const {GAME_STATE_ENUM} = require('../server/Constants');

class View {
	constructor() {
		this.$ = query => document.querySelector(query);
		this.lobbyMode();
	}

	setTitle(title) {
		this.$('#title').textContent = title;
	}

	setLobbyControlButtons(buttonRowss) {
		buttonRowss.forEach(buttonRow => {
			let buttonRowEl = document.createElement('div');
			buttonRowEl.classList.add('lobby-controls');
			buttonRow.forEach(({id, text, handler}) => {
				let button = document.createElement('button');
				button.id = id;
				button.textContent = text;
				button.addEventListener('click', () => {
					if (![...this.$('#game-list').children]
						.some(gameItem => gameItem.gameId === this.selectedGameId))
						this.selectedGameId = null;
					handler(this.selectedGameId);
				});
				buttonRowEl.appendChild(button);
			});
			this.$('#lobby-controls-container').appendChild(buttonRowEl);
		});
	}

	addUsernameChangeListener(listener) {
		this.$('#username-input').addEventListener('change', () =>
			listener(this.$('#username-input').value));
	}

	addLeaveGameListener(listener) {
		this.$('#leave-game-button').addEventListener('click', listener);
	}

	lobbyMode() {
		this.$('.lobby-container').hidden = false;
		this.$('.game-container').hidden = true;
		this.updateLobbySelected({gameId: null});
	}

	gameMode() {
		this.$('.lobby-container').hidden = true;
		this.$('.game-container').hidden = false;
	}

	setClientName(clientName) {
		this.$('#username-input').value = clientName;
	}

	updateLobby(population, clientNames, games) {
		this.$('#population-count-text').textContent = population;

		// todo extract client/game list logic to reusable helper
		let clientList = this.$('#client-list');
		for (let i = clientList.childElementCount; i < clientNames.length; i++) {
			let clientItem = document.createElement('div');
			clientItem.classList.add('client-item');
			clientItem.addEventListener('click', () =>
				this.updateLobbySelected(clientItem));
			clientList.appendChild(clientItem)
		}
		while (clientList.childElementCount > clientNames.length)
			clientList.lastChild.remove();

		clientNames.forEach((name, i) => {
			let clientItem = clientList.children[i];
			clientItem.textContent = name;
		});

		let gameList = this.$('#game-list');
		for (let i = gameList.childElementCount; i < games.length; i++) {
			let gameItem = document.createElement('div');
			gameItem.classList.add('game-item');
			gameItem.addEventListener('click', () =>
				this.updateLobbySelected(gameItem));
			gameList.appendChild(gameItem)
		}
		while (gameList.childElementCount > games.length)
			gameList.lastChild.remove();

		games.forEach(({id, name, state, population}, i) => {
			let gameItem = gameList.children[i];
			gameItem.gameId = id;
			gameItem.textContent = `${name}: ${View.getGameStateText(state)} (${population} / ${2} players)`; // todo don't hardcode 2
		});
	};

	updateLobbySelected(selectedGameItem) {
		this.selectedGameId = selectedGameItem.gameId;
		[...this.$('#game-list').children].forEach(gameItem =>
			gameItem.classList.toggle('selected', gameItem === selectedGameItem));
	}

	updateGame(name, state) {
		this.$('#game-name').textContent = name;
		this.$('#game-state').textContent = View.getGameStateText(state);
	}

	static getGameStateText(state) {
		switch (state) {
			case GAME_STATE_ENUM.WAITING_FOR_PLAYERS:
				return 'waiting for players';
			case GAME_STATE_ENUM.IN_PROGRESS:
				return 'game in progress';
			case GAME_STATE_ENUM.ABANDONED:
				return 'game abandoned';
			case GAME_STATE_ENUM.ENDED:
				return 'game ended';
			default:
				console.warn('unrecognized game state:', state);
		}
	}
}

module.exports = View;
