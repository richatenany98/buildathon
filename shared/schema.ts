import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const repositories = pgTable("repositories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  defaultRef: text("default_ref").notNull().default("refs/heads/main"),
  cloneProtocol: text("clone_protocol").notNull().default("https"),
  analysisStatus: text("analysis_status").notNull().default("queued"), // queued | cloning | analyzing | completed | failed
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  commitCount: integer("commit_count").default(0),
  contributorCount: integer("contributor_count").default(0),
  fileCount: integer("file_count").default(0),
  changeEventCount: integer("change_event_count").default(0),
  majorFeatureCount: integer("major_feature_count").default(0),
  confidenceScore: integer("confidence_score").default(0),
});

export const commits = pgTable("commits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repositoryId: varchar("repository_id").references(() => repositories.id).notNull(),
  sha: text("sha").notNull(),
  message: text("message").notNull(),
  author: text("author").notNull(),
  authorEmail: text("author_email").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  filesChanged: integer("files_changed").default(0),
  linesAdded: integer("lines_added").default(0),
  linesRemoved: integer("lines_removed").default(0),
  filePaths: json("file_paths").$type<string[]>().default([]),
  fileTypes: json("file_types").$type<string[]>().default([]),
  changeTypes: json("change_types").$type<string[]>().default([]),
});

export const changeEvents = pgTable("change_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repositoryId: varchar("repository_id").references(() => repositories.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // new_feature | enhancement | bug_fix | refactoring | optimization
  timestamp: timestamp("timestamp").notNull(),
  commitShas: json("commit_shas").$type<string[]>().notNull(),
  filesAffected: json("files_affected").$type<string[]>().notNull(),
  rationale: text("rationale"),
  businessImpact: text("business_impact"),
});

export const queries = pgTable("queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repositoryId: varchar("repository_id").references(() => repositories.id).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  relatedCommits: json("related_commits").$type<string[]>().notNull(),
  relatedEvents: json("related_events").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertRepositorySchema = createInsertSchema(repositories).pick({
  url: true,
  name: true,
  description: true,
  defaultRef: true,
  cloneProtocol: true,
});

export const insertQuerySchema = createInsertSchema(queries).pick({
  repositoryId: true,
  question: true,
});

export type Repository = typeof repositories.$inferSelect;
export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Commit = typeof commits.$inferSelect;
export type ChangeEvent = typeof changeEvents.$inferSelect;
export type Query = typeof queries.$inferSelect;
export type InsertQuery = z.infer<typeof insertQuerySchema>;
