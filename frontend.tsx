import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

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

interface AppState {
	players: Player[];
	playerCount: number;
	currentPlayerId: string | null;
	connected: boolean;
	currentGame: GeneratedGame | null;
	isGenerating: boolean;
}

declare global {
	interface Window {
		GAME_PLAYERS: Player[];
		GAME_CANVAS: HTMLElement | null;
		sendGameAction: (action: any) => void;
		onGameAction: ((action: any, playerId: string) => void) | null;
	}
}

// Generate SVG polygon points for n sides, filling the container optimally
function generatePolygonPoints(sides: number, size: number): string {
	if (sides < 3) sides = 3;

	const points: string[] = [];
	const angleOffset = -Math.PI / 2; // Start from top
	const center = size / 2;

	// Calculate radius to maximize fill while keeping padding
	// For triangles, we need to account for the centroid offset
	let radius = center * 0.92;

	// Adjust vertical centering for triangles
	let yOffset = 0;
	if (sides === 3) {
		// Triangle centroid is 1/3 from base, so shift down slightly to center visually
		yOffset = center * 0.08;
	}

	for (let i = 0; i < sides; i++) {
		const angle = angleOffset + (2 * Math.PI * i) / sides;
		const x = center + radius * Math.cos(angle);
		const y = center + radius * Math.sin(angle) + yOffset;
		points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
	}

	return points.join(" ");
}

// Calculate player panel positions at the midpoint of each polygon edge
function getPlayerPositions(playerCount: number, index: number): React.CSSProperties {
	const sides = Math.max(playerCount, 3);
	const angleOffset = -Math.PI / 2; // Start from top
	const radius = 0.92; // Match the polygon radius

	// Get the two vertices that form this player's edge
	const angle1 = angleOffset + (2 * Math.PI * index) / sides;
	const angle2 = angleOffset + (2 * Math.PI * (index + 1)) / sides;

	// Midpoint angle of the edge
	const midAngle = (angle1 + angle2) / 2;

	// Position at the edge midpoint, then push outward
	const edgeMidRadius = radius * Math.cos(Math.PI / sides); // Distance to edge midpoint
	// Triangles need more offset since edgeMidRadius is smaller (cos(60°) = 0.5)
	const panelOffset = sides === 3 ? 0.32 : 0.18;
	const panelDistance = edgeMidRadius + panelOffset; // Push outside the edge

	let x = 50 + panelDistance * 50 * Math.cos(midAngle);
	let y = 50 + panelDistance * 50 * Math.sin(midAngle);

	// Apply same yOffset for triangles
	if (sides === 3) {
		y += 4; // Match the visual offset
	}

	return {
		left: `${x}%`,
		top: `${y}%`,
		transform: "translate(-50%, -50%)",
	};
}

// Player emojis for avatars
const playerEmojis = ["🐰", "🐱", "🐶", "🐼", "🐨", "🦦", "🐧", "🐹"];

function GameBoard() {
	const [appState, setAppState] = useState<AppState>({
		players: [],
		playerCount: 0,
		currentPlayerId: null,
		connected: false,
		currentGame: null,
		isGenerating: false,
	});

	const [ws, setWs] = useState<WebSocket | null>(null);
	const [gamePrompt, setGamePrompt] = useState("");
	const [error, setError] = useState<string | null>(null);
	const gameCanvasRef = useRef<HTMLDivElement>(null);
	const gameStyleRef = useRef<HTMLStyleElement | null>(null);

	// Connect to WebSocket
	useEffect(() => {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const socket = new WebSocket(`${protocol}//${window.location.host}`);

		socket.onopen = () => {
			console.log("Connected to game server");
			setAppState((prev) => ({ ...prev, connected: true }));
		};

		socket.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);

				if (data.type === "welcome") {
					setAppState((prev) => ({
						...prev,
						players: data.players,
						playerCount: data.playerCount,
						currentPlayerId: data.playerId,
						currentGame: data.currentGame,
						isGenerating: data.isGenerating,
					}));
				} else if (data.type === "state") {
					setAppState((prev) => ({
						...prev,
						players: data.players,
						playerCount: data.playerCount,
						currentGame: data.currentGame,
						isGenerating: data.isGenerating,
					}));
				} else if (data.type === "generating") {
					setAppState((prev) => ({ ...prev, isGenerating: data.isGenerating }));
				} else if (data.type === "game_ready") {
					setAppState((prev) => ({ ...prev, currentGame: data.game, isGenerating: false }));
				} else if (data.type === "game_action") {
					// Forward action to game
					if (window.onGameAction) {
						window.onGameAction(data.action, data.playerId);
					}
				} else if (data.type === "error") {
					setError(data.message);
					setTimeout(() => setError(null), 5000);
				}
			} catch (e) {
				console.error("Failed to parse message:", e);
			}
		};

		socket.onclose = () => {
			console.log("Disconnected from game server");
			setAppState((prev) => ({ ...prev, connected: false }));
		};

		socket.onerror = (error) => {
			console.error("WebSocket error:", error);
		};

		setWs(socket);

		return () => {
			socket.close();
		};
	}, []);

	// Setup game action sender
	useEffect(() => {
		window.sendGameAction = (action: any) => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "game_action", action }));
			}
		};
	}, [ws]);

	// Render generated game
	useEffect(() => {
		if (!appState.currentGame || !gameCanvasRef.current) return;

		const game = appState.currentGame;
		const canvas = gameCanvasRef.current;

		// Clear previous game
		canvas.innerHTML = game.html;

		// Remove old styles
		if (gameStyleRef.current) {
			gameStyleRef.current.remove();
		}

		// Add scoped styles
		const style = document.createElement("style");
		style.textContent = game.css;
		document.head.appendChild(style);
		gameStyleRef.current = style;

		// Setup game context
		window.GAME_PLAYERS = appState.players;
		window.GAME_CANVAS = canvas;
		window.onGameAction = null;

		// Execute game JS
		try {
			const gameScript = new Function(game.js);
			gameScript();
		} catch (e) {
			console.error("Game script error:", e);
		}

		return () => {
			if (gameStyleRef.current) {
				gameStyleRef.current.remove();
				gameStyleRef.current = null;
			}
			window.onGameAction = null;
		};
	}, [appState.currentGame, appState.players]);

	// Ping to keep connection alive
	useEffect(() => {
		if (!ws || !appState.connected) return;

		const interval = setInterval(() => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "ping" }));
			}
		}, 30000);

		return () => clearInterval(interval);
	}, [ws, appState.connected]);

	// Calculate polygon sides based on player count
	const polygonSides = useMemo(() => {
		return Math.max(appState.playerCount, 3);
	}, [appState.playerCount]);

	const handleGenerateGame = useCallback(() => {
		if (!ws || !gamePrompt.trim() || appState.isGenerating) return;
		ws.send(JSON.stringify({ type: "generate_game", prompt: gamePrompt.trim() }));
	}, [ws, gamePrompt, appState.isGenerating]);

	const handleResetGame = useCallback(() => {
		if (!ws) return;
		ws.send(JSON.stringify({ type: "reset_game" }));
		setGamePrompt("");
	}, [ws]);

	return (
		<div className="game-container">
			{/* Decorative stars */}
			<h1 className="game-title">
				{appState.currentGame ? appState.currentGame.title : "Cozy Game Room"}
			</h1>

			<div className={`connection-status ${appState.connected ? "connected" : "disconnected"}`}>
				{appState.connected ? "~ Connected ~" : "Connecting..."}
			</div>

			{error && <div className="error-toast">{error}</div>}

			<div className="board-container">
				{/* Central polygon board using SVG */}
				<svg className="polygon-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
					<defs>
						<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
							<feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#8B7355" floodOpacity="0.3" />
						</filter>
					</defs>
					<polygon
						className="polygon-board"
						points={generatePolygonPoints(polygonSides, 100)}
						filter="url(#shadow)"
					/>
					<polygon
						className="polygon-board-inner"
						points={generatePolygonPoints(polygonSides, 100)}
					/>
				</svg>

				{/* Game canvas or input prompt */}
				<div className="board-content-overlay">
					{appState.currentGame ? (
						<>
							<div
								id="game-canvas"
								ref={gameCanvasRef}
								className="game-canvas"
							/>
							<button className="reset-game-btn" onClick={handleResetGame}>
								New Game
							</button>
						</>
					) : appState.isGenerating ? (
						<div className="generating-indicator">
							<div className="spinner" />
							<p>Creating your unique game...</p>
							<p className="generating-hint">This may take a moment</p>
						</div>
					) : (
						<div className="game-prompt-container">
							{appState.playerCount >= 2 ? (
								<>
									<p className="prompt-label">What game shall we play?</p>
									<input
										type="text"
										className="game-prompt-input"
										placeholder="e.g., space racing, treasure hunt, word battle..."
										value={gamePrompt}
										onChange={(e) => setGamePrompt(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && handleGenerateGame()}
										disabled={appState.isGenerating}
									/>
									<button
										className="generate-btn"
										onClick={handleGenerateGame}
										disabled={!gamePrompt.trim() || appState.isGenerating}
									>
										Create Game ✨
									</button>
									<p className="prompt-hint">AI will create a unique {appState.playerCount}-player game</p>
								</>
							) : (
								<div className="waiting-prompt">
									<p>Waiting for players...</p>
									<p className="prompt-hint">Need at least 2 players to start</p>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Player panels positioned around the polygon */}
				{appState.players.map((player, index) => (
					<div
						key={player.id}
						className={`player-panel ${player.id === appState.currentPlayerId ? "current-player" : ""}`}
						style={getPlayerPositions(Math.max(appState.playerCount, 3), index)}
					>
						<div
							className="player-avatar"
							style={{ backgroundColor: player.color }}
						>
							{playerEmojis[index % playerEmojis.length]}
						</div>
						<div className="player-name">{player.name}</div>
						{player.id === appState.currentPlayerId && (
							<div className="player-badge">( you )</div>
						)}
					</div>
				))}
			</div>

			<div className="player-count">
				{appState.playerCount} / 8 players
			</div>

			{appState.currentGame && (
				<div className="game-rules">
					<details>
						<summary>Rules</summary>
						<ul>
							{appState.currentGame.rules.map((rule, i) => (
								<li key={i}>{rule}</li>
							))}
						</ul>
					</details>
				</div>
			)}
		</div>
	);
}

const root = createRoot(document.getElementById("root")!);
root.render(<GameBoard />);
