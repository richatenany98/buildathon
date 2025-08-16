import { 
  type Repository, 
  type InsertRepository, 
  type Commit, 
  type ChangeEvent, 
  type Query, 
  type InsertQuery 
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Repository operations
  createRepository(repo: InsertRepository): Promise<Repository>;
  getRepository(id: string): Promise<Repository | undefined>;
  getRepositoryByUrl(url: string): Promise<Repository | undefined>;
  updateRepository(id: string, updates: Partial<Repository>): Promise<Repository>;
  getAllRepositories(): Promise<Repository[]>;
  
  // Commit operations
  createCommits(commits: Omit<Commit, 'id'>[]): Promise<void>;
  getCommitsByRepository(repositoryId: string): Promise<Commit[]>;
  getCommitsByShas(repositoryId: string, shas: string[]): Promise<Commit[]>;
  
  // Change event operations
  createChangeEvents(events: Omit<ChangeEvent, 'id'>[]): Promise<void>;
  getChangeEventsByRepository(repositoryId: string): Promise<ChangeEvent[]>;
  getChangeEventsByIds(ids: string[]): Promise<ChangeEvent[]>;
  
  // Query operations
  createQuery(query: InsertQuery & { answer: string; relatedCommits: string[]; relatedEvents: string[] }): Promise<Query>;
  getQueriesByRepository(repositoryId: string): Promise<Query[]>;
}

export class MemStorage implements IStorage {
  private repositories: Map<string, Repository> = new Map();
  private commits: Map<string, Commit> = new Map();
  private changeEvents: Map<string, ChangeEvent> = new Map();
  private queries: Map<string, Query> = new Map();

  async createRepository(insertRepo: InsertRepository): Promise<Repository> {
    const id = randomUUID();
    const repo: Repository = {
      id,
      ...insertRepo,
      analysisStatus: "queued",
      createdAt: new Date(),
      lastAnalyzedAt: null,
      commitCount: 0,
      contributorCount: 0,
      fileCount: 0,
      changeEventCount: 0,
      majorFeatureCount: 0,
      confidenceScore: 0,
    };
    this.repositories.set(id, repo);
    return repo;
  }

  async getRepository(id: string): Promise<Repository | undefined> {
    return this.repositories.get(id);
  }

  async getRepositoryByUrl(url: string): Promise<Repository | undefined> {
    return Array.from(this.repositories.values()).find(repo => repo.url === url);
  }

  async updateRepository(id: string, updates: Partial<Repository>): Promise<Repository> {
    const existing = this.repositories.get(id);
    if (!existing) throw new Error(`Repository ${id} not found`);
    
    const updated = { ...existing, ...updates };
    this.repositories.set(id, updated);
    return updated;
  }

  async getAllRepositories(): Promise<Repository[]> {
    return Array.from(this.repositories.values());
  }

  async createCommits(commits: Omit<Commit, 'id'>[]): Promise<void> {
    for (const commit of commits) {
      const id = randomUUID();
      this.commits.set(id, { id, ...commit });
    }
  }

  async getCommitsByRepository(repositoryId: string): Promise<Commit[]> {
    return Array.from(this.commits.values()).filter(c => c.repositoryId === repositoryId);
  }

  async getCommitsByShas(repositoryId: string, shas: string[]): Promise<Commit[]> {
    return Array.from(this.commits.values()).filter(
      c => c.repositoryId === repositoryId && shas.includes(c.sha)
    );
  }

  async createChangeEvents(events: Omit<ChangeEvent, 'id'>[]): Promise<void> {
    for (const event of events) {
      const id = randomUUID();
      this.changeEvents.set(id, { id, ...event });
    }
  }

  async getChangeEventsByRepository(repositoryId: string): Promise<ChangeEvent[]> {
    return Array.from(this.changeEvents.values()).filter(e => e.repositoryId === repositoryId);
  }

  async getChangeEventsByIds(ids: string[]): Promise<ChangeEvent[]> {
    return Array.from(this.changeEvents.values()).filter(e => ids.includes(e.id));
  }

  async createQuery(queryData: InsertQuery & { answer: string; relatedCommits: string[]; relatedEvents: string[] }): Promise<Query> {
    const id = randomUUID();
    const query: Query = {
      id,
      ...queryData,
      createdAt: new Date(),
    };
    this.queries.set(id, query);
    return query;
  }

  async getQueriesByRepository(repositoryId: string): Promise<Query[]> {
    return Array.from(this.queries.values()).filter(q => q.repositoryId === repositoryId);
  }
}

export const storage = new MemStorage();
