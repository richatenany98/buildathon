import mongoose from 'mongoose';
import { 
  RepositoryModel,
  CommitModel,
  ChangeEventModel,
  QueryModel,
  type Repository,
  type Commit,
  type ChangeEvent,
  type Query,
  type InsertRepository,
  type InsertQuery
} from "@shared/schema";

export interface IStorage {
  // Repository operations
  createRepository(repo: InsertRepository): Promise<Repository>;
  getRepository(id: string): Promise<Repository | undefined>;
  getRepositoryByUrl(url: string): Promise<Repository | undefined>;
  updateRepository(id: string, updates: Partial<Repository>): Promise<Repository>;
  getAllRepositories(): Promise<Repository[]>;
  
  // Commit operations
  createCommits(commits: Omit<Commit, '_id'>[]): Promise<void>;
  getCommitsByRepository(repositoryId: string): Promise<Commit[]>;
  getCommitsByShas(repositoryId: string, shas: string[]): Promise<Commit[]>;
  
  // Change event operations
  createChangeEvents(events: Omit<ChangeEvent, '_id'>[]): Promise<void>;
  getChangeEventsByRepository(repositoryId: string): Promise<ChangeEvent[]>;
  getChangeEventsByIds(ids: string[]): Promise<ChangeEvent[]>;
  
  // Query operations
  createQuery(query: InsertQuery & { answer: string; relatedCommits: string[]; relatedEvents: string[] }): Promise<Query>;
  getQueriesByRepository(repositoryId: string): Promise<Query[]>;
}

export class MongoStorage implements IStorage {
  constructor(private mongoUrl: string) {
    this.connect();
  }

  private async connect() {
    try {
      await mongoose.connect(this.mongoUrl);
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async createRepository(insertRepo: InsertRepository): Promise<Repository> {
    const repository = new RepositoryModel(insertRepo);
    await repository.save();
    return repository.toObject() as Repository;
  }

  async getRepository(id: string): Promise<Repository | undefined> {
    const repository = await RepositoryModel.findById(id);
    return repository?.toObject() as Repository || undefined;
  }

  async getRepositoryByUrl(url: string): Promise<Repository | undefined> {
    const repository = await RepositoryModel.findOne({ url });
    return repository?.toObject() as Repository || undefined;
  }

  async updateRepository(id: string, updates: Partial<Repository>): Promise<Repository> {
    const repository = await RepositoryModel.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    );
    if (!repository) {
      throw new Error(`Repository ${id} not found`);
    }
    return repository.toObject() as Repository;
  }

  async getAllRepositories(): Promise<Repository[]> {
    const repositories = await RepositoryModel.find().sort({ createdAt: -1 });
    return repositories.map(repo => repo.toObject()) as Repository[];
  }

  async createCommits(commits: Omit<Commit, '_id'>[]): Promise<void> {
    if (commits.length === 0) return;
    await CommitModel.insertMany(commits);
  }

  async getCommitsByRepository(repositoryId: string): Promise<Commit[]> {
    const commits = await CommitModel.find({ repositoryId }).sort({ timestamp: -1 });
    return commits.map(commit => commit.toObject()) as Commit[];
  }

  async getCommitsByShas(repositoryId: string, shas: string[]): Promise<Commit[]> {
    const commits = await CommitModel.find({ 
      repositoryId, 
      sha: { $in: shas } 
    });
    return commits.map(commit => commit.toObject()) as Commit[];
  }

  async createChangeEvents(events: Omit<ChangeEvent, '_id'>[]): Promise<void> {
    if (events.length === 0) return;
    await ChangeEventModel.insertMany(events);
  }

  async getChangeEventsByRepository(repositoryId: string): Promise<ChangeEvent[]> {
    const events = await ChangeEventModel.find({ repositoryId }).sort({ timestamp: -1 });
    return events.map(event => event.toObject()) as ChangeEvent[];
  }

  async getChangeEventsByIds(ids: string[]): Promise<ChangeEvent[]> {
    const events = await ChangeEventModel.find({ _id: { $in: ids } });
    return events.map(event => event.toObject()) as ChangeEvent[];
  }

  async createQuery(queryData: InsertQuery & { answer: string; relatedCommits: string[]; relatedEvents: string[] }): Promise<Query> {
    const query = new QueryModel(queryData);
    await query.save();
    return query.toObject() as Query;
  }

  async getQueriesByRepository(repositoryId: string): Promise<Query[]> {
    const queries = await QueryModel.find({ repositoryId }).sort({ createdAt: -1 });
    return queries.map(query => query.toObject()) as Query[];
  }
}

// In-memory storage fallback (same as before but using MongoDB interfaces)
export class MemStorage implements IStorage {
  private repositories: Map<string, Repository> = new Map();
  private commits: Map<string, Commit> = new Map();
  private changeEvents: Map<string, ChangeEvent> = new Map();
  private queries: Map<string, Query> = new Map();

  async createRepository(insertRepo: InsertRepository): Promise<Repository> {
    const id = new mongoose.Types.ObjectId().toString();
    const repo: Repository = {
      _id: id,
      ...insertRepo,
      analysisStatus: "queued",
      createdAt: new Date(),
      lastAnalyzedAt: undefined,
      commitCount: 0,
      contributorCount: 0,
      fileCount: 0,
      changeEventCount: 0,
      majorFeatureCount: 0,
      confidenceScore: 0,
    } as Repository;
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
    return Array.from(this.repositories.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createCommits(commits: Omit<Commit, '_id'>[]): Promise<void> {
    console.log(`MongoStorage.createCommits called with ${commits.length} commits`);
    commits.forEach(commit => {
      const id = new mongoose.Types.ObjectId().toString();
      this.commits.set(id, { ...commit, _id: id } as Commit);
      console.log(`Saved commit ${commit.sha?.substring(0,8)} with id ${id}`);
    });
    console.log(`MongoStorage now has ${this.commits.size} total commits`);
  }

  async getCommitsByRepository(repositoryId: string): Promise<Commit[]> {
    console.log(`MongoStorage.getCommitsByRepository called for ${repositoryId}`);
    console.log(`Total commits in storage: ${this.commits.size}`);
    const allCommits = Array.from(this.commits.values());
    console.log(`All repository IDs in storage:`, allCommits.map(c => c.repositoryId));
    const filtered = allCommits.filter(commit => commit.repositoryId === repositoryId);
    console.log(`Found ${filtered.length} commits for repository ${repositoryId}`);
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getCommitsByShas(repositoryId: string, shas: string[]): Promise<Commit[]> {
    return Array.from(this.commits.values())
      .filter(commit => commit.repositoryId === repositoryId && shas.includes(commit.sha));
  }

  async createChangeEvents(events: Omit<ChangeEvent, '_id'>[]): Promise<void> {
    events.forEach(event => {
      const id = new mongoose.Types.ObjectId().toString();
      this.changeEvents.set(id, { ...event, _id: id } as ChangeEvent);
    });
  }

  async getChangeEventsByRepository(repositoryId: string): Promise<ChangeEvent[]> {
    return Array.from(this.changeEvents.values())
      .filter(event => event.repositoryId === repositoryId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getChangeEventsByIds(ids: string[]): Promise<ChangeEvent[]> {
    return Array.from(this.changeEvents.values())
      .filter(event => ids.includes(event._id));
  }

  async createQuery(queryData: InsertQuery & { answer: string; relatedCommits: string[]; relatedEvents: string[] }): Promise<Query> {
    const id = new mongoose.Types.ObjectId().toString();
    const query: Query = {
      _id: id,
      ...queryData,
      createdAt: new Date(),
    } as Query;
    this.queries.set(id, query);
    return query;
  }

  async getQueriesByRepository(repositoryId: string): Promise<Query[]> {
    return Array.from(this.queries.values())
      .filter(query => query.repositoryId === repositoryId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

// Export storage instance
const mongoUrl = process.env.MONGODB_URL || process.env.DATABASE_URL;

export const storage: IStorage = mongoUrl && mongoUrl.includes('mongodb') 
  ? new MongoStorage(mongoUrl) 
  : new MemStorage();

console.log('Using storage:', mongoUrl && mongoUrl.includes('mongodb') ? 'MongoDB' : 'In-memory');