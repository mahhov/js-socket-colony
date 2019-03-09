let randId = () => parseInt(Math.random() * 1e15) + 1;

let randName = () => {
	const NAMES = ['alligator', 'crocodile', 'alpaca', 'ant', 'antelope', 'ape', 'armadillo', 'donkey', 'baboon', 'badger', 'bat', 'bear', 'beaver', 'bee', 'beetle', 'buffalo', 'butterfly', 'camel', 'carabao', 'water buffalo', 'caribou', 'cat', 'cattle', 'cheetah', 'chimpanzee', 'chinchilla', 'cicada', 'clam', 'cockroach', 'cod', 'coyote', 'crab', 'cricket', 'crow', 'raven', 'deer', 'dinosaur', 'dog', 'dolphin', 'porpoise', 'duck', 'eagle', 'echidna', 'eel', 'elephant', 'elk', 'ferret', 'fish', 'fly', 'fox', 'frog', 'toad', 'gerbil', 'giraffe', 'gnat', 'gnu', 'wildebeest', 'goat', 'goldfish', 'goose', 'gorilla', 'grasshopper', 'guinea pig', 'hamster', 'hare', 'hedgehog', 'herring', 'hippopotamus', 'hornet', 'horse', 'hound', 'hyena', 'impala', 'insect', 'jackal', 'jellyfish', 'kangaroo', 'wallaby', 'koala', 'leopard', 'lion', 'lizard', 'llama', 'locust', 'louse', 'macaw', 'mallard', 'mammoth', 'manatee', 'marten', 'mink', 'minnow', 'mole', 'monkey', 'moose', 'mosquito', 'mouse', 'rat', 'mule', 'muskrat', 'otter', 'ox', 'oyster', 'panda', 'pig', 'hog', 'swine', 'wild pig', 'platypus', 'porcupine', 'prairie dog', 'pug', 'rabbit', 'raccoon', 'reindeer', 'rhinoceros', 'salmon', 'sardine', 'scorpion', 'seal', 'sea lion', 'serval', 'shark', 'sheep', 'skunk', 'snail', 'snake', 'spider', 'squirrel', 'swan', 'termite', 'tiger', 'trout', 'turtle', 'tortoise', 'walrus', 'wasp', 'weasel', 'whale', 'wolf', 'wombat', 'woodchuck', 'worm', 'yak', 'yellowjacket', 'zebra'];
	return NAMES[parseInt(Math.random() * NAMES.length)];
};

let randInt = max => parseInt(Math.random() * max);

module.exports = {randId, randName, randInt};
