import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { requireAuth, getCurrentUser } from "./auth-routes";
import { randomBytes } from "crypto";
import { z } from "zod";

// Define validation schemas for MongoDB
const insertDocumentSchema = z.object({
  title: z.string(),
  content: z.string().optional(),
  language: z.string().optional(),
});

const insertUserSchema = z.object({
  sessionId: z.string(),
  username: z.string(),
  color: z.string(),
  currentDocument: z.string().optional(),
});

const insertDocumentVersionSchema = z.object({
  documentId: z.string(),
  content: z.string(),
  version: z.number(),
  operations: z.array(z.any()).optional(),
  authorId: z.string(),
  authorName: z.string(),
});

const userColors = [
  "#F44747", "#007ACC", "#4EC9B0", "#FFCC02", "#C678DD", "#98C379", 
  "#E06C75", "#61AFEF", "#D19A66", "#56B6C2", "#ABB2BF", "#E5C07B"
];

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // REST API routes
  app.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const documents = await storage.getDocumentsByUser(userId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // If document is public, allow access without authentication
      if (document.isPublic) {
        return res.json(document);
      }

      // For private documents, require authentication
      if (!req.session.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.session.userId;
      // Check if user has access to this document
      if (document.ownerId !== userId && 
          !document.collaborators.includes(userId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.post("/api/documents", requireAuth, async (req, res) => {
    try {
      const documentData = insertDocumentSchema.parse(req.body);
      const userId = req.session.userId!;
      const user = req.session.user!;
      
      const document = await storage.createDocument({
        ...documentData,
        ownerId: userId,
        ownerUsername: user.username,
      });
      res.status(201).json(document);
    } catch (error) {
      res.status(400).json({ error: "Invalid document data" });
    }
  });

  app.get("/api/documents/:id/versions", requireAuth, async (req, res) => {
    try {
      // First check if user has access to the document
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const userId = req.session.userId!;
      if (document.ownerId !== userId && 
          !document.collaborators.includes(userId) && 
          !document.isPublic) {
        return res.status(403).json({ error: "Access denied" });
      }

      const versions = await storage.getDocumentVersions(req.params.id, 10);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch document versions" });
    }
  });

  // Socket.io for real-time collaboration
  io.on("connection", (socket) => {
    let currentUser: any = null;

    socket.on("user-join", async (data: { username: string; documentId: string }) => {
      try {
        // Generate session ID and assign color
        const sessionId = randomBytes(16).toString("hex");
        const color = userColors[Math.floor(Math.random() * userColors.length)];
        
        // Create or update user
        currentUser = await storage.createUser({
          sessionId,
          username: data.username,
          color,
          currentDocument: data.documentId,
        });

        // Join document room
        socket.join(data.documentId);

        // Update document active users
        const document = await storage.getDocument(data.documentId);
        if (document) {
          const activeUsers = document.activeUsers || [];
          if (!activeUsers.includes(currentUser.id)) {
            activeUsers.push(currentUser.id);
            await storage.updateDocument(data.documentId, { activeUsers });
          }
        }

        // Notify other users
        socket.to(data.documentId).emit("user-joined", {
          id: currentUser.id,
          username: currentUser.username,
          color: currentUser.color,
        });

        // Send current users to the new user
        const documentUsers = await storage.getUsersByDocument(data.documentId);
        socket.emit("users-list", documentUsers.map(user => ({
          id: user.id,
          username: user.username,
          color: user.color,
        })));

        // Send current document state
        if (document) {
          socket.emit("document-sync", {
            content: document.content,
            version: 1, // Basic versioning
          });
        }

      } catch (error) {
        socket.emit("error", { message: "Failed to join document" });
      }
    });

    socket.on("text-change", async (data: { 
      documentId: string; 
      operations: any[]; 
      content: string;
      version: number;
    }) => {
      try {
        if (!currentUser) return;

        // Update document content
        const document = await storage.updateDocument(data.documentId, {
          content: data.content,
        });

        if (document) {
          // Create version history entry
          await storage.createDocumentVersion({
            documentId: data.documentId,
            content: data.content,
            version: data.version,
            operations: data.operations,
            authorId: currentUser.id,
            authorName: currentUser.username,
          });

          // Broadcast to other users in the same document
          socket.to(data.documentId).emit("text-change", {
            operations: data.operations,
            content: data.content,
            version: data.version,
            authorId: currentUser.id,
            authorName: currentUser.username,
          });
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to save changes" });
      }
    });

    socket.on("cursor-position", (data: { 
      documentId: string; 
      position: { line: number; column: number }; 
    }) => {
      if (!currentUser) return;
      
      socket.to(data.documentId).emit("cursor-position", {
        userId: currentUser.id,
        username: currentUser.username,
        color: currentUser.color,
        position: data.position,
      });
    });

    socket.on("text-selection", (data: { 
      documentId: string; 
      selection: { startLine: number; startColumn: number; endLine: number; endColumn: number }; 
    }) => {
      if (!currentUser) return;
      
      socket.to(data.documentId).emit("text-selection", {
        userId: currentUser.id,
        username: currentUser.username,
        color: currentUser.color,
        selection: data.selection,
      });
    });

    socket.on("disconnect", async () => {
      if (!currentUser) return;

      try {
        // Remove user from active users in document
        if (currentUser.currentDocument) {
          const document = await storage.getDocument(currentUser.currentDocument);
          if (document) {
            const activeUsers = (document.activeUsers || []).filter(id => id !== currentUser.id);
            await storage.updateDocument(currentUser.currentDocument, { activeUsers });
          }

          // Notify other users
          socket.to(currentUser.currentDocument).emit("user-left", {
            id: currentUser.id,
            username: currentUser.username,
          });
        }

        // Update user's last seen time
        await storage.updateUser(currentUser.id, { 
          currentDocument: null,
          lastSeen: new Date() 
        });
      } catch (error) {
        console.error("Error handling user disconnect:", error);
      }
    });
  });

  // Cleanup inactive users periodically
  setInterval(async () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    await storage.cleanupInactiveUsers(thirtySecondsAgo);
  }, 60000); // Run every minute

  return httpServer;
}
