import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

async function startServer() {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Presence and state tracking
  const rooms = new Map<string, any>();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", ({ roomId, user }) => {
      socket.join(roomId);
      console.log(`User ${user.name} joined room ${roomId}`);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, { users: new Map(), canvas: [], doc: "" });
      }
      
      const room = rooms.get(roomId);
      room.users.set(socket.id, { ...user, cursor: { x: 0, y: 0 } });

      // Broadcast updated user list
      io.to(roomId).emit("presence-update", Array.from(room.users.values()));
      
      // Send initial state to the new user
      socket.emit("init-state", { canvas: room.canvas, doc: room.doc });
    });

    socket.on("cursor-move", ({ roomId, cursor, position }) => {
      const room = rooms.get(roomId);
      if (room && room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        if (position) user.cursor = position;
        if (cursor) user.docCursor = cursor;
        
        socket.to(roomId).emit("cursor-update", { 
          uid: user.uid, 
          displayName: user.displayName,
          color: user.color || '#18181b',
          position, 
          ...cursor,
          timestamp: Date.now()
        });
      }
    });

    socket.on("canvas-update", ({ roomId, elements }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.canvas = elements;
        socket.to(roomId).emit("canvas-sync", elements);
      }
    });

    socket.on("doc-update", ({ roomId, content }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.doc = content;
        socket.to(roomId).emit("doc-sync", content);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      rooms.forEach((room, roomId) => {
        if (room.users.has(socket.id)) {
          room.users.delete(socket.id);
          io.to(roomId).emit("presence-update", Array.from(room.users.values()));
        }
      });
    });
  });

  // AI Proxy Routes
  app.post("/api/chat", async (req, res) => {
    const { messages, settings, modelId, searchEnabled, libraryContext } = req.body;

    try {
      if (modelId.startsWith('gpt')) {
        if (!openai) throw new Error("OpenAI API key not configured");
        
        const response = await openai.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: settings.customSystemInstruction || "You are a helpful assistant." },
            ...messages.map((m: any) => ({ role: m.role, content: m.content }))
          ],
          temperature: 0.7,
        });

        return res.json({ text: response.choices[0].message.content });
      }

      if (modelId.startsWith('claude')) {
        if (!anthropic) throw new Error("Anthropic API key not configured");

        const response = await anthropic.messages.create({
          model: modelId,
          max_tokens: 4096,
          system: settings.customSystemInstruction || "You are a helpful assistant.",
          messages: messages.map((m: any) => ({ role: m.role, content: m.content }))
        });

        // @ts-ignore
        return res.json({ text: response.content[0].text });
      }

      res.status(400).json({ error: "Unsupported model" });
    } catch (error: any) {
      console.error("AI Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
