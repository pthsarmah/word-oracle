# Your Multiplayer

AI-generated casual multiplayer games. Players join a shared game room, describe what kind of game they'd like to play, and Claude AI generates a completely custom browser-based game tailored to the number of players.

## Features

- **AI-Powered Game Generation** - Creates unique games based on player prompts using Claude AI
- **Real-Time Multiplayer** - WebSocket-based synchronization for up to 8 players
- **Dynamic Game Board** - Polygon-shaped board that adapts to player count (triangle for 3, square for 4, etc.)
- **Cozy Aesthetic** - Warm colors, handwritten fonts, and playful animations

## Tech Stack

- **Bun** - Runtime, package manager, and build tool
- **React 19** - Frontend UI
- **Tailwind CSS** - Styling
- **Anthropic SDK** - Claude AI integration
- **WebSocket** - Real-time communication (Bun built-in)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

```bash
bun install
```

### Configuration

Create a `.env` file with your Anthropic API key:

```
ANTHROPIC_API_KEY=your_api_key_here
```

### Development

```bash
bun dev
```

This starts the server with hot reload enabled.

### Production

```bash
bun start
```

## How It Works

1. Players connect to the game room via WebSocket
2. Each player is assigned a unique ID, color, and auto-generated name
3. Any player can describe the game they want to play
4. Claude AI generates a complete game (HTML, CSS, JavaScript) based on the prompt and player count
5. The game is broadcast to all players and rendered in the shared canvas
6. Player actions are synchronized in real-time through WebSocket

## Project Structure

```
├── index.ts          # Backend server with WebSocket handling
├── frontend.tsx      # React frontend component
├── index.html        # HTML entry point
├── styles.css        # Styling
├── build.ts          # Build script
├── bunfig.toml       # Bun configuration
└── package.json      # Dependencies
```

## License

MIT
