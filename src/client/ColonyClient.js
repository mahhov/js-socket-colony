const Client = require('./Client');

let client = new Client();

client.view.setTitle('JS Colony Online');

let viewButtons = [[{
	id: "create-human-game-button",
	text: "play against human",
	handler: () => client.createGame({}),
}, {
	id: "join-game-button",
	text: "join game",
	handler: selectedGameId => {
		if (selectedGameId)
			client.joinGame(selectedGameId);
	},
}], [{
	id: "create-local-game-button",
	text: "play locally",
	handler: () => client.createGame({local: true}),
}, {
	id: "create-bot-game-button",
	text: "play against bot",
	handler: () => client.createGame({bot: 1}),
}, {
	id: "create-2-bot-game-button",
	text: "watch bot v bot",
	handler: () => client.createGame({bot: 2}),
}]];

client.view.setLobbyControlButtons(viewButtons);

client.view.addUsernameChangeListener(name => client.requestUsernameChange(name));
client.view.addLeaveGameListener(() => client.leaveGame());

window.addEventListener('load', () => client.createClient());

client.startSendingGameInput();

// todo send input-game only if game started
// todo hover tile
// todo keep displaying lobby until games starts
