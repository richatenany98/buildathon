import mongoose, { Schema, Document } from 'mongoose';
import { z } from "zod";

// MongoDB Schema Definitions
export interface Repository extends Document {
  _id: string;
  id?: string; // For compatibility with frontend that might expect 'id'
  url: string;
  name: string;
  description?: string;
  defaultRef: string;
  cloneProtocol: string;
  analysisStatus: 'queued' | 'cloning' | 'analyzing' | 'completed' | 'failed';
  createdAt: Date;
  lastAnalyzedAt?: Date;
  commitCount: number;
  contributorCount: number;
  fileCount: number;
  changeEventCount: number;
  majorFeatureCount: number;
  confidenceScore: number;
}

export interface Commit extends Document {
  _id: string;
  repositoryId: string;
  sha: string;
  message: string;
  author: string;
  authorEmail: string;
  timestamp: Date;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  filePaths: string[];
  fileTypes: string[];
  changeTypes: string[];
}

export interface ChangeEvent extends Document {
  _id: string;
  repositoryId: string;
  title: string;
  description: string;
  category: 'new_feature' | 'enhancement' | 'bug_fix' | 'refactoring' | 'optimization';
  timestamp: Date;
  commitShas: string[];
  filesAffected: string[];
  rationale?: string;
  businessImpact?: string;
}

export interface Query extends Document {
  _id: string;
  repositoryId: string;
  question: string;
  answer: string;
  relatedCommits: string[];
  relatedEvents: string[];
  createdAt: Date;
}

// Mongoose Schemas
const repositorySchema = new Schema<Repository>({
  url: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  defaultRef: { type: String, required: true, default: "refs/heads/main" },
  cloneProtocol: { type: String, required: true, default: "https" },
  analysisStatus: { 
    type: String, 
    required: true, 
    default: "queued",
    enum: ['queued', 'cloning', 'analyzing', 'completed', 'failed']
  },
  createdAt: { type: Date, default: Date.now },
  lastAnalyzedAt: { type: Date },
  commitCount: { type: Number, default: 0 },
  contributorCount: { type: Number, default: 0 },
  fileCount: { type: Number, default: 0 },
  changeEventCount: { type: Number, default: 0 },
  majorFeatureCount: { type: Number, default: 0 },
  confidenceScore: { type: Number, default: 0 },
});

const commitSchema = new Schema<Commit>({
  repositoryId: { type: String, required: true },
  sha: { type: String, required: true },
  message: { type: String, required: true },
  author: { type: String, required: true },
  authorEmail: { type: String, required: true },
  timestamp: { type: Date, required: true },
  filesChanged: { type: Number, default: 0 },
  linesAdded: { type: Number, default: 0 },
  linesRemoved: { type: Number, default: 0 },
  filePaths: { type: [String], default: [] },
  fileTypes: { type: [String], default: [] },
  changeTypes: { type: [String], default: [] },
});

const changeEventSchema = new Schema<ChangeEvent>({
  repositoryId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['new_feature', 'enhancement', 'bug_fix', 'refactoring', 'optimization']
  },
  timestamp: { type: Date, required: true },
  commitShas: { type: [String], required: true },
  filesAffected: { type: [String], required: true },
  rationale: { type: String },
  businessImpact: { type: String },
});

const querySchema = new Schema<Query>({
  repositoryId: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  relatedCommits: { type: [String], required: true },
  relatedEvents: { type: [String], required: true },
  createdAt: { type: Date, default: Date.now },
});

// Export Models
export const RepositoryModel = mongoose.model<Repository>('Repository', repositorySchema);
export const CommitModel = mongoose.model<Commit>('Commit', commitSchema);
export const ChangeEventModel = mongoose.model<ChangeEvent>('ChangeEvent', changeEventSchema);
export const QueryModel = mongoose.model<Query>('Query', querySchema);

// Zod validation schemas
export const insertRepositorySchema = z.object({
  url: z.string().url(),
  name: z.string(),
  description: z.string().optional(),
  defaultRef: z.string().default("refs/heads/main"),
  cloneProtocol: z.enum(["https", "ssh"]).default("https"),
});

export const insertQuerySchema = z.object({
  repositoryId: z.string(),
  question: z.string(),
});

export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type InsertQuery = z.infer<typeof insertQuerySchema>;

export type Repository = typeof repositories.$inferSelect;
export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Commit = typeof commits.$inferSelect;
export type ChangeEvent = typeof changeEvents.$inferSelect;
export type Query = typeof queries.$inferSelect;
export type InsertQuery = z.infer<typeof insertQuerySchema>;
