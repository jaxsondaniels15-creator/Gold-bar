import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { nanoid } from "nanoid";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Lobby management
  const lobbies = new Map<string, {
    id: string;
    players: { id: string; name: string; score: number; ready: boolean }[];
    gameState: 'waiting' | 'starting' | 'playing' | 'ended';
    currentRound: number;
    targetPos?: { x: number; y: number };
    targetType?: 'normal' | 'golden';
  }>();

  const matchmakingQueue: string[] = [];

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create-lobby", (playerName) => {
      const lobbyId = nanoid(6).toUpperCase();
      const lobby = {
        id: lobbyId,
        players: [{ id: socket.id, name: playerName, score: 0, ready: false }],
        gameState: 'waiting' as const,
        currentRound: 0
      };
      lobbies.set(lobbyId, lobby);
      socket.join(lobbyId);
      socket.emit("lobby-created", lobby);
    });

    socket.on("join-lobby", ({ lobbyId, playerName }) => {
      const lobby = lobbies.get(lobbyId.toUpperCase());
      if (lobby) {
        if (lobby.players.length < 2) {
          lobby.players.push({ id: socket.id, name: playerName, score: 0, ready: false });
          socket.join(lobbyId.toUpperCase());
          io.to(lobbyId.toUpperCase()).emit("player-joined", lobby);
        } else {
          socket.emit("error", "Lobby is full");
        }
      } else {
        socket.emit("error", "Lobby not found");
      }
    });

    socket.on("matchmaking", (playerName) => {
      if (matchmakingQueue.length > 0) {
        const opponentId = matchmakingQueue.shift()!;
        const lobbyId = nanoid(6).toUpperCase();
        const lobby = {
          id: lobbyId,
          players: [
            { id: opponentId, name: "Opponent", score: 0, ready: true },
            { id: socket.id, name: playerName, score: 0, ready: true }
          ],
          gameState: 'starting' as const,
          currentRound: 0
        };
        lobbies.set(lobbyId, lobby);
        
        const opponentSocket = io.sockets.sockets.get(opponentId);
        if (opponentSocket) {
          opponentSocket.join(lobbyId);
        }
        socket.join(lobbyId);
        
        io.to(lobbyId).emit("match-found", lobby);
        startMultiplayerGame(lobbyId);
      } else {
        matchmakingQueue.push(socket.id);
        socket.emit("matchmaking-started");
      }
    });

    socket.on("player-ready", (lobbyId) => {
      const lobby = lobbies.get(lobbyId);
      if (lobby) {
        const player = lobby.players.find(p => p.id === socket.id);
        if (player) {
          player.ready = true;
          io.to(lobbyId).emit("player-ready-update", lobby.players);
          
          if (lobby.players.length === 2 && lobby.players.every(p => p.ready)) {
            startMultiplayerGame(lobbyId);
          }
        }
      }
    });

    socket.on("report-hit", ({ lobbyId, reactionTime }) => {
      const lobby = lobbies.get(lobbyId);
      if (lobby && lobby.gameState === 'playing') {
        lobby.gameState = 'ended'; // Round ended
        const player = lobby.players.find(p => p.id === socket.id);
        if (player) {
          player.score += (lobby.targetType === 'golden' ? 5 : 1);
          io.to(lobbyId).emit("round-winner", {
            winnerId: socket.id,
            winnerName: player.name,
            reactionTime,
            players: lobby.players
          });

          // Start next round after delay
          setTimeout(() => {
            if (lobbies.has(lobbyId)) {
              startNextRound(lobbyId);
            }
          }, 2000);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      const index = matchmakingQueue.indexOf(socket.id);
      if (index > -1) matchmakingQueue.splice(index, 1);

      for (const [id, lobby] of lobbies.entries()) {
        const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
        if (playerIndex > -1) {
          lobby.players.splice(playerIndex, 1);
          if (lobby.players.length === 0) {
            lobbies.delete(id);
          } else {
            io.to(id).emit("player-left", lobby);
            lobby.gameState = 'waiting';
          }
        }
      }
    });
  });

  function startMultiplayerGame(lobbyId: string) {
    const lobby = lobbies.get(lobbyId);
    if (lobby) {
      lobby.gameState = 'starting';
      lobby.currentRound = 0;
      io.to(lobbyId).emit("game-starting");
      setTimeout(() => startNextRound(lobbyId), 3000);
    }
  }

  function startNextRound(lobbyId: string) {
    const lobby = lobbies.get(lobbyId);
    if (lobby) {
      lobby.currentRound++;
      lobby.gameState = 'playing';
      lobby.targetPos = {
        x: Math.random() * 80 + 10, // 10% to 90%
        y: Math.random() * 70 + 15  // 15% to 85%
      };
      lobby.targetType = Math.random() < 0.1 ? 'golden' : 'normal';
      
      io.to(lobbyId).emit("new-round", {
        round: lobby.currentRound,
        targetPos: lobby.targetPos,
        targetType: lobby.targetType,
        delay: Math.random() * 2000 + 1000 // Random delay before target appears
      });
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
