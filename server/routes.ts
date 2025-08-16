import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GitAnalyzer } from "./services/git-analyzer";
import { AIAnalyzer } from "./services/ai-analyzer";
import { insertRepositorySchema, insertQuerySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const gitAnalyzer = new GitAnalyzer();
  const aiAnalyzer = new AIAnalyzer();

  // Get all repositories
  app.get("/api/repositories", async (req, res) => {
    try {
      const repositories = await storage.getAllRepositories();
      res.json(repositories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get repository by ID
  app.get("/api/repositories/:id", async (req, res) => {
    try {
      const repository = await storage.getRepository(req.params.id);
      if (!repository) {
        return res.status(404).json({ error: "Repository not found" });
      }
      res.json(repository);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create and analyze repository
  app.post("/api/repositories", async (req, res) => {
    try {
      const validatedData = insertRepositorySchema.parse(req.body);
      
      // Check if repository already exists
      const existing = await storage.getRepositoryByUrl(validatedData.url);
      if (existing) {
        return res.status(400).json({ error: "Repository already exists" });
      }

      // Create repository record
      const repository = await storage.createRepository(validatedData);
      res.json(repository);

      // Start analysis in background
      analyzeRepositoryBackground(repository.id);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get repository analysis progress
  app.get("/api/repositories/:id/progress", async (req, res) => {
    try {
      const repository = await storage.getRepository(req.params.id);
      if (!repository) {
        return res.status(404).json({ error: "Repository not found" });
      }

      const commits = await storage.getCommitsByRepository(req.params.id);
      const changeEvents = await storage.getChangeEventsByRepository(req.params.id);

      res.json({
        status: repository.analysisStatus,
        commitCount: commits.length,
        changeEventCount: changeEvents.length,
        progress: getAnalysisProgress(repository.analysisStatus, commits.length),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit query
  app.post("/api/repositories/:id/query", async (req, res) => {
    try {
      const validatedData = insertQuerySchema.parse({
        ...req.body,
        repositoryId: req.params.id,
      });

      const repository = await storage.getRepository(req.params.id);
      if (!repository) {
        return res.status(404).json({ error: "Repository not found" });
      }

      if (repository.analysisStatus !== "completed") {
        return res.status(400).json({ error: "Repository analysis not completed" });
      }

      // Get AI answer
      const queryResponse = await aiAnalyzer.answerQuery(req.params.id, validatedData.question);
      
      // Store query and response
      const query = await storage.createQuery({
        ...validatedData,
        answer: queryResponse.answer,
        relatedCommits: queryResponse.relatedCommits,
        relatedEvents: queryResponse.relatedEvents,
      });

      res.json({
        ...query,
        confidence: queryResponse.confidence,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get repository queries
  app.get("/api/repositories/:id/queries", async (req, res) => {
    try {
      const queries = await storage.getQueriesByRepository(req.params.id);
      res.json(queries);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get repository change events
  app.get("/api/repositories/:id/events", async (req, res) => {
    try {
      const events = await storage.getChangeEventsByRepository(req.params.id);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get repository commits
  app.get("/api/repositories/:id/commits", async (req, res) => {
    try {
      const commits = await storage.getCommitsByRepository(req.params.id);
      res.json(commits);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Retry failed repository analysis
  app.post("/api/repositories/:id/retry", async (req, res) => {
    try {
      const repository = await storage.getRepository(req.params.id);
      if (!repository) {
        return res.status(404).json({ error: "Repository not found" });
      }

      // Reset status to queued
      await storage.updateRepository(req.params.id, { analysisStatus: "queued" });
      
      // Start analysis in background
      analyzeRepositoryBackground(req.params.id);
      
      res.json({ message: "Analysis restarted" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Background analysis function
  async function analyzeRepositoryBackground(repositoryId: string) {
    try {
      const repository = await storage.getRepository(repositoryId);
      if (!repository) return;

      // Update status to cloning
      await storage.updateRepository(repositoryId, { analysisStatus: "cloning" });

      // Clone repository
      await gitAnalyzer.cloneRepository(repository);

      // Update status to analyzing
      await storage.updateRepository(repositoryId, { analysisStatus: "analyzing" });

      // Analyze commits
      const commits = await gitAnalyzer.analyzeCommits(repositoryId);
      
      // Get repository stats
      const stats = await gitAnalyzer.getRepositoryStats();

      // Analyze with AI
      const dbCommits = await storage.getCommitsByRepository(repositoryId);
      await aiAnalyzer.analyzeCommitBatches(repositoryId, dbCommits);

      // Update repository with final stats
      await storage.updateRepository(repositoryId, {
        analysisStatus: "completed",
        lastAnalyzedAt: new Date(),
        commitCount: commits.length,
        contributorCount: stats.contributors.size,
        fileCount: stats.totalFiles,
        changeEventCount: (await storage.getChangeEventsByRepository(repositoryId)).length,
        majorFeatureCount: (await storage.getChangeEventsByRepository(repositoryId))
          .filter(e => e.category === 'new_feature').length,
        confidenceScore: 94, // Default confidence score
      });

      // Cleanup
      await gitAnalyzer.cleanup();

      console.log(`Analysis completed for repository ${repositoryId}`);
    } catch (error) {
      console.error(`Analysis failed for repository ${repositoryId}:`, error);
      await storage.updateRepository(repositoryId, { analysisStatus: "failed" });
      await gitAnalyzer.cleanup();
    }
  }

  function getAnalysisProgress(status: string, commitCount: number): number {
    switch (status) {
      case "queued": return 0;
      case "cloning": return 25;
      case "analyzing": return 50 + Math.min(45, (commitCount / 1000) * 45);
      case "completed": return 100;
      case "failed": return 0;
      default: return 0;
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
