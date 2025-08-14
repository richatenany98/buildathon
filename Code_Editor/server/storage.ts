import { 
  type Document, 
  type InsertDocument, 
  type DocumentVersion, 
  type InsertDocumentVersion, 
  type User, 
  type InsertUser 
} from "@shared/mongodb-schema";
import { MongoStorage } from "./mongodb-storage";

export interface IStorage {
  // Document operations
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  getDocumentsByUser(userId: string): Promise<Document[]>;
  
  // Document version operations
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;
  getDocumentVersions(documentId: string, limit?: number): Promise<DocumentVersion[]>;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserBySessionId(sessionId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUsersByDocument(documentId: string): Promise<User[]>;
  cleanupInactiveUsers(beforeTime: Date): Promise<void>;
}

// Initialize MongoDB storage
const mongoStorage = new MongoStorage();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ybansal1203:r0ZMnGIlNbre8ddW@buildathon.pqtqkko.mongodb.net/?retryWrites=true&w=majority&appName=Buildathon";

mongoStorage.connect(MONGODB_URI).catch(error => {
  console.error('Failed to connect to MongoDB:', error);
  process.exit(1);
});

export const storage = mongoStorage;
