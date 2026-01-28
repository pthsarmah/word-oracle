import index from "./index.html";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface Player {
  id: string;
  name: string;
  color: string;
}

interface GeneratedGame {
  id: string;
  title: string;
  description: string;
  rules: string[];
  html: string;
  css: string;
  js: string;
  playerCount: number;
  prompt: string;
  createdAt: number;
}

interface GameState {
  players: Player[];
  maxPlayers: number;
  currentGame: GeneratedGame | null;
  isGenerating: boolean;
}

const gameState: GameState = {
  players: [],
  maxPlayers: 8,
  currentGame: null,
  isGenerating: false,
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

function broadcastState() {
  const message = JSON.stringify({
    type: "state",
    players: gameState.players,
    playerCount: gameState.players.length,
    currentGame: gameState.currentGame,
    isGenerating: gameState.isGenerating,
  });

  for (const ws of connections.values()) {
    ws.send(message);
  }
}

function broadcastGenerating(isGenerating: boolean) {
  gameState.isGenerating = isGenerating;
  const message = JSON.stringify({
    type: "generating",
    isGenerating,
  });
  for (const ws of connections.values()) {
    ws.send(message);
  }
}

function broadcastGame(game: GeneratedGame) {
  gameState.currentGame = game;
  const message = JSON.stringify({
    type: "game_ready",
    game,
  });
  for (const ws of connections.values()) {
    ws.send(message);
  }
}

const GAME_DESIGN_SYSTEM_PROMPT = `You are an expert casual multiplayer game designer. Your task is to create UNIQUE, FUN, and PLAYABLE browser-based games that work on a shared canvas.

## Core Principles
- Every game MUST be completely unique - never repeat game mechanics or themes
- Games should be simple enough to understand in seconds
- Must work for the exact number of players specified
- Must be turn-based OR real-time with clear visual feedback
- Must be completable in 2-5 minutes

## Technical Requirements
You will output a game that renders inside a container div with id "game-canvas".
- The canvas is a polygon shape, so design accordingly
- Each player has: id, name, color (provided in players array)
- Use the provided player colors for visual distinction
- All game state must be managed in JavaScript
- Must handle player interactions via clicks/touches
- Include clear visual turn indicators if turn-based
- Add victory/draw detection

## Output Format
Return ONLY valid JSON with this exact structure:
{
  "title": "Unique Creative Game Name",
  "description": "One sentence describing the game",
  "rules": ["Rule 1", "Rule 2", "Rule 3"],
  "html": "<div>...game HTML structure...</div>",
  "css": "/* scoped styles for #game-canvas */",
  "js": "// Self-executing game code that initializes with window.GAME_PLAYERS array"
}

## JavaScript Context
Your JS code will have access to:
- window.GAME_PLAYERS: Array of {id, name, color} objects
- window.GAME_CANVAS: The game container element
- window.sendGameAction(action): Function to broadcast actions to other players
- window.onGameAction = (action, playerId) => {}: Callback for receiving actions

## Creativity Guidelines
- Mix unexpected themes: space + cooking, medieval + sports, underwater + puzzles
- Invent new game mechanics, don't just copy existing games
- Use the polygon shape creatively in gameplay
- Add small delightful animations and sound-like visual feedback
- Make losing fun too - add humor or style

Generate a completely original game that has NEVER been made before.`;

async function generateGame(prompt: string, players: Player[]): Promise<GeneratedGame> {
  const sessionId = Math.random().toString(36).substring(2, 9);
  const timestamp = Date.now();

  const userPrompt = `Create a unique casual multiplayer game based on this idea: "${prompt}"

Player count: ${players.length}
Players: ${JSON.stringify(players.map(p => ({ id: p.id, name: p.name, color: p.color })))}
Session ID (for uniqueness): ${sessionId}
Timestamp: ${timestamp}

Remember: This game must be COMPLETELY UNIQUE to this session. Use the session ID and timestamp to inspire unique twists. Make it fun and memorable!`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: GAME_DESIGN_SYSTEM_PROMPT,
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = content.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  const gameData = JSON.parse(jsonStr.trim());

  return {
    id: sessionId,
    title: gameData.title,
    description: gameData.description,
    rules: gameData.rules,
    html: gameData.html,
    css: gameData.css,
    js: gameData.js,
    playerCount: players.length,
    prompt,
    createdAt: timestamp,
  };
}

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": index,
  },
  fetch(req, server) {
    // Handle WebSocket upgrade
    if (req.headers.get("upgrade") === "websocket") {
      const success = server.upgrade(req);
      if (success) {
        return undefined;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    // Return 404 for unhandled routes
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
      };

      (ws as any).playerId = playerId;
      connections.set(playerId, ws);
      gameState.players.push(player);

      // Send initial state to new player
      ws.send(JSON.stringify({
        type: "welcome",
        playerId,
        player,
        players: gameState.players,
        playerCount: gameState.players.length,
        currentGame: gameState.currentGame,
        isGenerating: gameState.isGenerating,
      }));

      // Broadcast updated state to all players
      broadcastState();

      console.log(`Player joined: ${player.name} (${playerId}). Total: ${gameState.players.length}`);
    },

    async message(ws, message) {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        } else if (data.type === "generate_game") {
          if (gameState.isGenerating) {
            ws.send(JSON.stringify({ type: "error", message: "Game generation already in progress" }));
            return;
          }

          if (gameState.players.length < 2) {
            ws.send(JSON.stringify({ type: "error", message: "Need at least 2 players to generate a game" }));
            return;
          }

          console.log(`Generating game: "${data.prompt}" for ${gameState.players.length} players`);
          broadcastGenerating(true);

          try {
            const game = await generateGame(data.prompt, gameState.players);
            console.log(`Game generated: ${game.title}`);
            broadcastGenerating(false);
            broadcastGame(game);
          } catch (error) {
            console.error("Game generation failed:", error);
            broadcastGenerating(false);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            for (const conn of connections.values()) {
              conn.send(JSON.stringify({ type: "error", message: `Game generation failed: ${errorMessage}` }));
            }
          }
        } else if (data.type === "game_action") {
          // Broadcast game actions to all other players
          const playerId = (ws as any).playerId;
          for (const [id, conn] of connections.entries()) {
            if (id !== playerId) {
              conn.send(JSON.stringify({
                type: "game_action",
                action: data.action,
                playerId,
              }));
            }
          }
        } else if (data.type === "reset_game") {
          gameState.currentGame = null;
          broadcastState();
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

          console.log(`Player left: ${player.name} (${playerId}). Total: ${gameState.players.length}`);

          // Broadcast updated state
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

console.log("Game server running at http://localhost:3000");
