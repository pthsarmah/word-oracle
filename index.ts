import index from "./index.html";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const LOCAL_MODEL_URL = process.env.LOCAL_MODEL_URL || "http://localhost:8080/v1/chat/completions";

const USE_LOCAL_MODEL = process.env.USE_LOCAL_MODEL !== "false";


const GAME_THEMES: Record<string, { name: string; description: string; icon: string; words: string[] }> = {
	random: {
		name: "Random",
		description: "A mix of everything",
		icon: "🎲",
		words: ["Eiffel Tower", "Pizza", "Einstein", "Bitcoin", "Titanic", "Pikachu", "Yoga", "Spotify", "Mars", "Shakespeare", "Sushi", "Cleopatra", "iPhone", "Minecraft", "Mona Lisa", "Taj Mahal", "Beyoncé", "Netflix", "Dinosaur", "Pyramids"]
	},
	sports: {
		name: "Sports",
		description: "Athletes, teams, equipment",
		icon: "⚽",
		words: ["Michael Jordan", "Serena Williams", "FIFA World Cup", "Olympics", "Basketball", "Tennis Racket", "Super Bowl", "Usain Bolt", "Muhammad Ali", "Cristiano Ronaldo", "Lionel Messi", "Tiger Woods", "LeBron James", "Tom Brady", "Wimbledon", "Golf", "Swimming", "Marathon", "Skateboard", "Baseball"]
	},
	celebrities: {
		name: "Celebrities",
		description: "Famous people from all fields",
		icon: "⭐",
		words: ["Taylor Swift", "Elon Musk", "Oprah Winfrey", "Kim Kardashian", "Dwayne Johnson", "Lady Gaga", "Brad Pitt", "Rihanna", "Will Smith", "Jennifer Lopez", "Kanye West", "Billie Eilish", "Tom Hanks", "Ariana Grande", "Drake", "Zendaya", "Bad Bunny", "Selena Gomez", "Leonardo DiCaprio", "BTS"]
	},
	food: {
		name: "Food & Drinks",
		description: "Dishes, ingredients, beverages",
		icon: "🍕",
		words: ["Pizza", "Sushi", "Tacos", "Chocolate", "Coffee", "Coca-Cola", "Hamburger", "Ice Cream", "Pasta", "Avocado", "Starbucks", "Croissant", "Ramen", "Cheese", "Wine", "Beer", "Pancakes", "Curry", "Lobster", "Kimchi"]
	},
	animals: {
		name: "Animals",
		description: "Creatures from around the world",
		icon: "🦁",
		words: ["Lion", "Elephant", "Dolphin", "Penguin", "Koala", "Giraffe", "Panda", "Tiger", "Eagle", "Shark", "Octopus", "Butterfly", "Gorilla", "Kangaroo", "Wolf", "Owl", "Flamingo", "Cheetah", "Whale", "Sloth"]
	},
	movies: {
		name: "Movies & TV",
		description: "Films, shows, characters",
		icon: "🎬",
		words: ["Star Wars", "Harry Potter", "The Godfather", "Titanic", "Avatar", "Spider-Man", "Batman", "Game of Thrones", "Breaking Bad", "Friends", "The Office", "Stranger Things", "Squid Game", "Shrek", "Frozen", "Jurassic Park", "The Lion King", "Marvel", "James Bond", "The Simpsons"]
	},
	music: {
		name: "Music",
		description: "Artists, songs, instruments",
		icon: "🎵",
		words: ["The Beatles", "Michael Jackson", "Elvis Presley", "Madonna", "Guitar", "Piano", "Spotify", "Grammy Awards", "Rolling Stones", "Queen", "Bob Marley", "Eminem", "Adele", "Ed Sheeran", "Drums", "Violin", "Hip Hop", "Jazz", "Woodstock", "Coachella"]
	},
	history: {
		name: "History",
		description: "Historical figures and events",
		icon: "📜",
		words: ["Cleopatra", "Napoleon", "World War II", "Abraham Lincoln", "Ancient Rome", "Egyptian Pyramids", "Julius Caesar", "French Revolution", "Martin Luther King", "Leonardo da Vinci", "Queen Victoria", "Alexander the Great", "Genghis Khan", "Renaissance", "Industrial Revolution", "Cold War", "Moon Landing", "Titanic", "Berlin Wall", "Columbus"]
	},
	science: {
		name: "Science & Tech",
		description: "Inventions, discoveries, gadgets",
		icon: "🔬",
		words: ["iPhone", "Tesla", "Google", "DNA", "Black Hole", "Artificial Intelligence", "Electricity", "Internet", "Robot", "Vaccine", "Atom", "SpaceX", "Microsoft", "Amazon", "Telescope", "Microscope", "Solar Panel", "5G", "Blockchain", "Quantum Computer"]
	},
	geography: {
		name: "Geography",
		description: "Places, landmarks, countries",
		icon: "🌍",
		words: ["Eiffel Tower", "Great Wall of China", "Mount Everest", "Amazon River", "Sahara Desert", "Grand Canyon", "Niagara Falls", "Statue of Liberty", "Big Ben", "Colosseum", "Sydney Opera House", "Machu Picchu", "Taj Mahal", "Antarctica", "Hawaii", "Tokyo", "Paris", "New York", "Dubai", "Australia"]
	},
	gaming: {
		name: "Video Games",
		description: "Games, characters, consoles",
		icon: "🎮",
		words: ["Minecraft", "Fortnite", "Mario", "Zelda", "PlayStation", "Xbox", "Nintendo", "Pokémon", "Grand Theft Auto", "Call of Duty", "Tetris", "Sonic", "League of Legends", "Roblox", "Among Us", "Elden Ring", "God of War", "Pac-Man", "Donkey Kong", "Steam"]
	},
	literature: {
		name: "Literature",
		description: "Books, authors, characters",
		icon: "📚",
		words: ["Harry Potter", "Shakespeare", "Sherlock Holmes", "Romeo and Juliet", "Lord of the Rings", "Stephen King", "Dracula", "Frankenstein", "Pride and Prejudice", "The Great Gatsby", "Moby Dick", "Alice in Wonderland", "Hamlet", "Charles Dickens", "Edgar Allan Poe", "Agatha Christie", "Game of Thrones", "The Hunger Games", "1984", "Don Quixote"]
	},
};

const usedWords: Map<string, Set<string>> = new Map();

async function callGroq(prompt: string, systemPrompt?: string): Promise<string> {
	const messages: Array<{ role: string; content: string }> = [];

	if (systemPrompt) {
		messages.push({ role: "system", content: systemPrompt });
	}
	messages.push({ role: "user", content: prompt });

	const response = await fetch(GROQ_API_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${GROQ_API_KEY}`,
		},
		body: JSON.stringify({
			model: GROQ_MODEL,
			messages,
			temperature: 0.7,
		}),
	});

	if (!response.ok) {
		throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data.choices?.[0]?.message?.content?.trim() || "";
}

async function callLocalModel(prompt: string, systemPrompt?: string): Promise<string> {
	const messages: Array<{ role: string; content: string }> = [];

	if (systemPrompt) {
		messages.push({ role: "system", content: systemPrompt });
	}
	messages.push({ role: "user", content: prompt });

	const response = await fetch(LOCAL_MODEL_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			messages,
			temperature: 0.7,
		}),
	});

	if (!response.ok) {
		throw new Error(`Local model error: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data.choices?.[0]?.message?.content?.trim() || "";
}

interface Player {
	id: string;
	name: string;
	color: string;
	score: number;
}

interface ChatMessage {
	id: string;
	playerId: string;
	playerName: string;
	playerColor: string;
	type: "question" | "guess" | "answer" | "system";
	content: string;
	timestamp: number;
	replyTo?: {
		playerName: string;
		playerColor: string;
	};
}

interface GameState {
	players: Player[];
	maxPlayers: number;
	secretWord: string | null;
	round: number;
	chatHistory: ChatMessage[];
	thinkingForPlayers: Set<string>; // Track which players have pending queries
	lastWinner: Player | null;
	currentTheme: string | null;
	themeSelectionActive: boolean;
	themeVotes: Map<string, string>; // playerId -> themeId
}

const gameState: GameState = {
	players: [],
	maxPlayers: 8,
	secretWord: null,
	round: 0,
	chatHistory: [],
	thinkingForPlayers: new Set(),
	lastWinner: null,
	currentTheme: null,
	themeSelectionActive: true, // Start with theme selection
	themeVotes: new Map(),
};

const playerColors = [
	"#FF6B6B", // coral red
	"#4ECDC4", // teal
	"#FFE66D", // sunny yellow
	"#95E1D3", // mint
	"#F38181", // salmon
	"#AA96DA", // lavender
	"#FCBAD3", // pink
	"#A8D8EA", // sky blue
];

const connections = new Map<string, any>();

function generatePlayerId(): string {
	return Math.random().toString(36).substring(2, 9);
}

function generatePlayerName(index: number): string {
	const adjectives = ["Happy", "Sleepy", "Bouncy", "Fuzzy", "Cozy", "Silly", "Jolly", "Wiggly"];
	const animals = ["Bunny", "Kitten", "Puppy", "Panda", "Koala", "Otter", "Penguin", "Hamster"];
	return `${adjectives[index % adjectives.length]} ${animals[index % animals.length]}`;
}

function generateMessageId(): string {
	return Math.random().toString(36).substring(2, 12);
}

// Convert themes to array format for frontend
function getThemesArray() {
	return Object.entries(GAME_THEMES).map(([id, data]) => ({
		id,
		name: data.name,
		description: data.description,
		icon: data.icon,
	}));
}

function broadcastState() {
	const message = JSON.stringify({
		type: "state",
		players: gameState.players,
		playerCount: gameState.players.length,
		round: gameState.round,
		chatHistory: gameState.chatHistory,
		thinkingForPlayers: Array.from(gameState.thinkingForPlayers),
		lastWinner: gameState.lastWinner,
		hasSecretWord: !!gameState.secretWord,
		// Theme info
		currentTheme: gameState.currentTheme,
		themeSelectionActive: gameState.themeSelectionActive,
		themeVotes: Object.fromEntries(gameState.themeVotes),
		themes: getThemesArray(),
	});

	for (const ws of connections.values()) {
		ws.send(message);
	}
}

function broadcastThemeUpdate() {
	const message = JSON.stringify({
		type: "theme_update",
		currentTheme: gameState.currentTheme,
		themeSelectionActive: gameState.themeSelectionActive,
		themeVotes: Object.fromEntries(gameState.themeVotes),
		themes: getThemesArray(),
	});

	for (const ws of connections.values()) {
		ws.send(message);
	}
}

function broadcastMessage(msg: ChatMessage) {
	const message = JSON.stringify({
		type: "chat_message",
		message: msg,
	});
	for (const ws of connections.values()) {
		ws.send(message);
	}
}

function broadcastThinkingForPlayer(playerId: string, isThinking: boolean) {
	if (isThinking) {
		gameState.thinkingForPlayers.add(playerId);
	} else {
		gameState.thinkingForPlayers.delete(playerId);
	}
	const message = JSON.stringify({
		type: "thinking",
		playerId,
		isThinking,
		thinkingForPlayers: Array.from(gameState.thinkingForPlayers),
	});
	for (const ws of connections.values()) {
		ws.send(message);
	}
}

function clearAllThinkingStates() {
	gameState.thinkingForPlayers.clear();
	const message = JSON.stringify({
		type: "thinking",
		playerId: null,
		isThinking: false,
		thinkingForPlayers: [],
	});
	for (const ws of connections.values()) {
		ws.send(message);
	}
}

function broadcastNewRound(winner: Player | null) {
	gameState.lastWinner = winner;
	const message = JSON.stringify({
		type: "new_round",
		round: gameState.round,
		winner,
		players: gameState.players,
	});
	for (const ws of connections.values()) {
		ws.send(message);
	}
}

async function webSearch(query: string): Promise<string> {
	try {
		const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
		console.log(searchUrl);
		const response = await fetch(searchUrl);
		if (!response.ok) return "";

		const data = await response.json();
		let results: string[] = [];

		if (data.Abstract) {
			results.push(data.Abstract);
		}

		if (data.RelatedTopics) {
			for (const topic of data.RelatedTopics.slice(0, 5)) {
				if (topic.Text) {
					results.push(topic.Text);
				}
			}
		}

		return results.join(" ");
	} catch (error) {
		console.error("Web search error:", error);
		return "";
	}
}

const ORACLE_SYSTEM_PROMPT = `
You are the Oracle in a guessing game. Players are trying to guess a secret word by asking questions.

STRICT RULES:
1. NEVER say the secret word or any obvious variation of it.
2. ONLY answer questions ABOUT the secret word (e.g., "Is it alive?", "What color?", "When was it made?")
3. REFUSE off-topic questions not about the secret word (e.g., "Who is the president?", "What's the weather?")
4. Keep answers to one short sentence.
5. If the answer would make the word too obvious, be more vague.
`;

const QUESTION_PROMPT = `
SECRET WORD (NEVER say this): {SECRET_WORD}

WEB SEARCH RESULTS ABOUT THE SECRET WORD:
{SEARCH_RESULTS}

PLAYER'S QUESTION: {QUESTION}

INSTRUCTIONS:
- If the question is ABOUT the secret word (asking its properties, characteristics, history, etc.), answer using the search results.
- If the question is OFF-TOPIC (not about the secret word, like general trivia), respond with "That's not about what you're trying to guess!"
- NEVER say "{SECRET_WORD}" or anything that directly reveals it.
- One short sentence only.
`;


// Guess detection is now simple: if message starts with "Guess:" it's a guess
function detectGuess(message: string): string | null {
	const trimmed = message.trim();
	// Check for "Guess:" prefix (case insensitive)
	const match = trimmed.match(/^guess:\s*(.+)$/i);
	if (match) {
		return match[1].trim();
	}
	return null;
}


function selectRandomWord(theme: string): string | null {
	const themeData = GAME_THEMES[theme];
	if (!themeData) return null;

	if (!usedWords.has(theme)) {
		usedWords.set(theme, new Set());
	}

	const used = usedWords.get(theme)!;
	const available = themeData.words.filter(w => !used.has(w));

	if (available.length === 0) {
		used.clear();
		return themeData.words[Math.floor(Math.random() * themeData.words.length)];
	}

	const word = available[Math.floor(Math.random() * available.length)];
	used.add(word);
	return word;
}

async function answerQuestion(question: string): Promise<string> {
	if (!gameState.secretWord) {
		return "No game in progress.";
	}

	const searchQuery = `${gameState.secretWord} ${question}`;
	const searchResults = await webSearch(searchQuery);

	const prompt = QUESTION_PROMPT
		.replace(/{SECRET_WORD}/g, gameState.secretWord)
		.replace("{SEARCH_RESULTS}", searchResults || "No search results available.")
		.replace("{QUESTION}", question);

	console.log(prompt);

	return USE_LOCAL_MODEL
		? await callLocalModel(prompt, ORACLE_SYSTEM_PROMPT)
		: await callGroq(prompt, ORACLE_SYSTEM_PROMPT);
}

function checkGuess(guess: string): boolean {
	if (!gameState.secretWord) return false;

	const normalizedGuess = guess.toLowerCase().trim()
		.replace(/^(the|a|an)\s+/i, ""); // Remove articles
	const normalizedWord = gameState.secretWord.toLowerCase().trim()
		.replace(/^(the|a|an)\s+/i, "");

	if (normalizedGuess === normalizedWord) return true;

	if (normalizedGuess + "s" === normalizedWord) return true;
	if (normalizedGuess === normalizedWord + "s") return true;

	if (normalizedGuess.includes(normalizedWord) || normalizedWord.includes(normalizedGuess)) {
		if (normalizedWord.length > 3) return true;
	}

	return false;
}

async function startNewRound(winner: Player | null = null) {
	if (gameState.themeSelectionActive || !gameState.currentTheme) {
		return;
	}

	gameState.round++;
	gameState.chatHistory = [];
	gameState.lastWinner = winner;

	clearAllThinkingStates();

	const theme = gameState.currentTheme;

	const word = selectRandomWord(theme);

	if (!word) {
		console.error("No words available for theme:", theme);
		return;
	}

	gameState.secretWord = word;
	console.log(`New round started. Secret word: ${word} (Theme: ${theme})`);

	const themeData = GAME_THEMES[theme];
	const themeName = themeData ? themeData.name : theme;

	const systemMsg: ChatMessage = {
		id: generateMessageId(),
		playerId: "system",
		playerName: "Game",
		playerColor: "#8B7355",
		type: "system",
		content: winner
			? `Round ${gameState.round} begins! ${winner.name} won the last round! Theme: ${themeName}`
			: `Round ${gameState.round} begins! I'm thinking of something from "${themeName}"... Ask questions to figure out what it is!`,
		timestamp: Date.now(),
	};
	gameState.chatHistory.push(systemMsg);

	broadcastNewRound(winner);
	broadcastMessage(systemMsg);
}

async function startGameWithTheme(theme: string) {
	gameState.currentTheme = theme;
	gameState.themeSelectionActive = false;
	gameState.themeVotes.clear();
	gameState.round = 0;
	gameState.chatHistory = [];
	gameState.secretWord = null;

	broadcastThemeUpdate();

	await startNewRound();
}

function returnToThemeSelection() {
	gameState.themeSelectionActive = true;
	gameState.currentTheme = null;
	gameState.themeVotes.clear();
	gameState.round = 0;
	gameState.chatHistory = [];
	gameState.secretWord = null;
	clearAllThinkingStates();

	broadcastThemeUpdate();
	broadcastState();
}

const server = Bun.serve({
	port: 3000,
	routes: {
		"/": index,
	},
	fetch(req, server) {
		if (req.headers.get("upgrade") === "websocket") {
			const success = server.upgrade(req);
			if (success) {
				return undefined;
			}
			return new Response("WebSocket upgrade failed", { status: 400 });
		}
		return new Response("Not Found", { status: 404 });
	},
	websocket: {
		open(ws) {
			const playerId = generatePlayerId();
			const playerIndex = gameState.players.length;

			if (playerIndex >= gameState.maxPlayers) {
				ws.send(JSON.stringify({ type: "error", message: "Game is full!" }));
				ws.close();
				return;
			}

			const player: Player = {
				id: playerId,
				name: generatePlayerName(playerIndex),
				color: playerColors[playerIndex % playerColors.length],
				score: 0,
			};

			(ws as any).playerId = playerId;
			connections.set(playerId, ws);
			gameState.players.push(player);

			// Send welcome state to new player
			ws.send(JSON.stringify({
				type: "welcome",
				playerId,
				player,
				players: gameState.players,
				playerCount: gameState.players.length,
				round: gameState.round,
				chatHistory: gameState.chatHistory,
				thinkingForPlayers: Array.from(gameState.thinkingForPlayers),
				lastWinner: gameState.lastWinner,
				hasSecretWord: !!gameState.secretWord,
				// Theme info
				currentTheme: gameState.currentTheme,
				themeSelectionActive: gameState.themeSelectionActive,
				themeVotes: Object.fromEntries(gameState.themeVotes),
				themes: getThemesArray(),
			}));

			// Broadcast join message
			const joinMsg: ChatMessage = {
				id: generateMessageId(),
				playerId: "system",
				playerName: "Game",
				playerColor: "#8B7355",
				type: "system",
				content: `${player.name} joined the game!`,
				timestamp: Date.now(),
			};
			gameState.chatHistory.push(joinMsg);
			broadcastState();

			// Don't auto-start - wait for theme selection

			console.log(`Player joined: ${player.name} (${playerId}). Total: ${gameState.players.length}`);
		},

		async message(ws, message) {
			try {
				const data = JSON.parse(message.toString());
				const playerId = (ws as any).playerId;
				const player = gameState.players.find(p => p.id === playerId);

				if (!player) return;

				if (data.type === "ping") {
					ws.send(JSON.stringify({ type: "pong" }));
				} else if (data.type === "question" || data.type === "message") {
					// Only block if no secret word or this specific player already has a pending query
					if (!gameState.secretWord || gameState.thinkingForPlayers.has(playerId)) return;

					const message = data.content.trim();
					if (!message) return;

					// Add player's message to chat
					const playerMsg: ChatMessage = {
						id: generateMessageId(),
						playerId: player.id,
						playerName: player.name,
						playerColor: player.color,
						type: "question",
						content: message,
						timestamp: Date.now(),
					};
					gameState.chatHistory.push(playerMsg);
					broadcastMessage(playerMsg);

					// Track the round when this request started
					const requestRound = gameState.round;

					broadcastThinkingForPlayer(playerId, true);
					try {
						// First, detect if this is a guess attempt
						const guessedWord = detectGuess(message);

						// Check if round changed while we were processing
						if (gameState.round !== requestRound) {
							// Round changed, discard this response
							gameState.thinkingForPlayers.delete(playerId);
							return;
						}

						if (guessedWord) {
							// It's a guess - check if correct (synchronous now)
							const isCorrect = checkGuess(guessedWord);

							if (isCorrect) {
								// Winner! Clear all pending thinking states
								clearAllThinkingStates();

								player.score++;
								const revealedWord = gameState.secretWord;

								const winMsg: ChatMessage = {
									id: generateMessageId(),
									playerId: "ai",
									playerName: "Oracle",
									playerColor: "#6B5B95",
									type: "answer",
									content: `YES! The word was "${revealedWord}"! ${player.name} wins this round!`,
									timestamp: Date.now(),
									replyTo: {
										playerName: player.name,
										playerColor: player.color,
									},
								};
								gameState.chatHistory.push(winMsg);
								broadcastMessage(winMsg);

								// Start new round after a delay
								setTimeout(() => {
									startNewRound(player);
								}, 3000);
							} else {
								const wrongMsg: ChatMessage = {
									id: generateMessageId(),
									playerId: "ai",
									playerName: "Oracle",
									playerColor: "#6B5B95",
									type: "answer",
									content: "No, that's not it. Keep trying!",
									timestamp: Date.now(),
									replyTo: {
										playerName: player.name,
										playerColor: player.color,
									},
								};
								gameState.chatHistory.push(wrongMsg);
								broadcastMessage(wrongMsg);
								broadcastThinkingForPlayer(playerId, false);
							}
						} else {
							const answer = await answerQuestion(message);

							if (gameState.round !== requestRound) {
								gameState.thinkingForPlayers.delete(playerId);
								return;
							}

							const answerMsg: ChatMessage = {
								id: generateMessageId(),
								playerId: "ai",
								playerName: "Oracle",
								playerColor: "#6B5B95",
								type: "answer",
								content: answer,
								timestamp: Date.now(),
								replyTo: {
									playerName: player.name,
									playerColor: player.color,
								},
							};
							gameState.chatHistory.push(answerMsg);
							broadcastMessage(answerMsg);
							broadcastThinkingForPlayer(playerId, false);
						}
					} catch (error) {
						console.error("Error processing message:", error);
						// Only clear thinking if still in the same round
						if (gameState.round === requestRound) {
							broadcastThinkingForPlayer(playerId, false);
						}
					}

				} else if (data.type === "new_round") {
					// Manual new round request (only if no queries are pending)
					if (gameState.thinkingForPlayers.size === 0) {
						startNewRound();
					}
				} else if (data.type === "skip_round") {
					// Skip round - send the answer to all players (they'll request new round after seeing it)
					if (gameState.thinkingForPlayers.size === 0 && gameState.secretWord) {
						const skippedMsg = JSON.stringify({
							type: "round_skipped",
							word: gameState.secretWord,
							theme: gameState.currentTheme,
						});
						for (const ws of connections.values()) {
							ws.send(skippedMsg);
						}
					}
				} else if (data.type === "vote_theme") {
					// Player votes for a theme
					const themeId = data.themeId;
					if (gameState.themeSelectionActive && themeId in GAME_THEMES) {
						gameState.themeVotes.set(playerId, themeId);
						broadcastThemeUpdate();
					}
				} else if (data.type === "confirm_theme") {
					// Player confirms to start with selected theme
					const themeId = data.themeId;
					if (gameState.themeSelectionActive && themeId in GAME_THEMES) {
						startGameWithTheme(themeId);
					}
				} else if (data.type === "change_theme") {
					// Return to theme selection (only if no queries pending)
					if (gameState.thinkingForPlayers.size === 0) {
						returnToThemeSelection();
					}
				}
			} catch (e) {
				console.error("Invalid message:", e);
			}
		},

		close(ws) {
			const playerId = (ws as any).playerId;
			if (playerId) {
				const playerIndex = gameState.players.findIndex(p => p.id === playerId);
				if (playerIndex !== -1) {
					const player = gameState.players[playerIndex];
					gameState.players.splice(playerIndex, 1);
					connections.delete(playerId);

					// Broadcast leave message
					const leaveMsg: ChatMessage = {
						id: generateMessageId(),
						playerId: "system",
						playerName: "Game",
						playerColor: "#8B7355",
						type: "system",
						content: `${player.name} left the game.`,
						timestamp: Date.now(),
					};
					gameState.chatHistory.push(leaveMsg);

					console.log(`Player left: ${player.name} (${playerId}). Total: ${gameState.players.length}`);

					broadcastState();
				}
			}
		},
	},
	development: {
		hmr: true,
		console: true,
	},
});

console.log("Word Oracle server running at http://localhost:3000");
console.log(`Groq model (corpus generation): ${GROQ_MODEL}`);
console.log(`User queries: ${USE_LOCAL_MODEL ? `Local model (${LOCAL_MODEL_URL})` : `Groq API (${GROQ_MODEL})`}`);
