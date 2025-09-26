import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { get_gemini_response } from "../ai_service";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api
  app.post("/api/ai-chat", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }
    try {
      const text = await get_gemini_response(prompt);
      res.json({ text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to get response from AI" });
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
