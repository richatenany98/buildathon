import mongoose from 'mongoose';
import { DocumentModel, DocumentVersionModel, UserModel } from '@shared/mongodb-schema';
import type { 
  Document, 
  InsertDocument, 
  DocumentVersion, 
  InsertDocumentVersion, 
  User, 
  InsertUser 
} from '@shared/mongodb-schema';
import type { IStorage } from './storage';

export class MongoStorage implements IStorage {
  private isConnected = false;

  async connect(connectionString: string): Promise<void> {
    if (this.isConnected) return;

    try {
      await mongoose.connect(connectionString);
      this.isConnected = true;
      console.log('Connected to MongoDB');

      // Create a default document if none exist
      const docCount = await DocumentModel.countDocuments();
      if (docCount === 0) {
        await this.createDefaultDocument();
      }
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  private async createDefaultDocument(): Promise<void> {
    // Skip creating default document for now since we need authenticated users
    console.log('Skipping default document creation - requires authenticated users');
  }

  private mongoDocToDoc(mongoDoc: any): Document {
    return {
      id: mongoDoc._id.toString(),
      title: mongoDoc.title,
      content: mongoDoc.content,
      language: mongoDoc.language,
      activeUsers: mongoDoc.activeUsers || [],
      ownerId: mongoDoc.ownerId,
      ownerUsername: mongoDoc.ownerUsername,
      isPublic: mongoDoc.isPublic,
      collaborators: mongoDoc.collaborators || [],
      createdAt: mongoDoc.createdAt,
      updatedAt: mongoDoc.updatedAt
    };
  }

  private mongoVersionToVersion(mongoVersion: any): DocumentVersion {
    return {
      id: mongoVersion._id.toString(),
      documentId: mongoVersion.documentId,
      content: mongoVersion.content,
      version: mongoVersion.version,
      operations: mongoVersion.operations || [],
      authorId: mongoVersion.authorId,
      authorName: mongoVersion.authorName,
      timestamp: mongoVersion.timestamp
    };
  }

  private mongoUserToUser(mongoUser: any): User {
    return {
      id: mongoUser._id.toString(),
      sessionId: mongoUser.sessionId,
      username: mongoUser.username,
      color: mongoUser.color,
      currentDocument: mongoUser.currentDocument,
      lastSeen: mongoUser.lastSeen
    };
  }

  async getDocument(id: string): Promise<Document | undefined> {
    try {
      const doc = await DocumentModel.findById(id);
      return doc ? this.mongoDocToDoc(doc) : undefined;
    } catch (error) {
      console.error('Error getting document:', error);
      return undefined;
    }
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const doc = new DocumentModel({
      title: insertDocument.title,
      content: insertDocument.content || '',
      language: insertDocument.language || 'javascript',
      ownerId: insertDocument.ownerId,
      ownerUsername: insertDocument.ownerUsername,
      isPublic: insertDocument.isPublic || false,
      collaborators: insertDocument.collaborators || [],
      activeUsers: []
    });

    const savedDoc = await doc.save();
    return this.mongoDocToDoc(savedDoc);
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    try {
      const updatedDoc = await DocumentModel.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true }
      );
      return updatedDoc ? this.mongoDocToDoc(updatedDoc) : undefined;
    } catch (error) {
      console.error('Error updating document:', error);
      return undefined;
    }
  }

  async getAllDocuments(): Promise<Document[]> {
    try {
      const docs = await DocumentModel.find({ isPublic: true }).sort({ updatedAt: -1 });
      return docs.map(doc => this.mongoDocToDoc(doc));
    } catch (error) {
      console.error('Error getting all documents:', error);
      return [];
    }
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    try {
      const docs = await DocumentModel.find({
        $or: [
          { ownerId: userId },
          { collaborators: userId }
        ]
      }).sort({ updatedAt: -1 });
      return docs.map(doc => this.mongoDocToDoc(doc));
    } catch (error) {
      console.error('Error getting user documents:', error);
      return [];
    }
  }

  async createDocumentVersion(insertVersion: InsertDocumentVersion): Promise<DocumentVersion> {
    const version = new DocumentVersionModel({
      documentId: insertVersion.documentId,
      content: insertVersion.content,
      version: insertVersion.version,
      operations: insertVersion.operations || [],
      authorId: insertVersion.authorId,
      authorName: insertVersion.authorName
    });

    const savedVersion = await version.save();
    return this.mongoVersionToVersion(savedVersion);
  }

  async getDocumentVersions(documentId: string, limit = 10): Promise<DocumentVersion[]> {
    try {
      const versions = await DocumentVersionModel
        .find({ documentId })
        .sort({ timestamp: -1 })
        .limit(limit);
      return versions.map(version => this.mongoVersionToVersion(version));
    } catch (error) {
      console.error('Error getting document versions:', error);
      return [];
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findById(id);
      return user ? this.mongoUserToUser(user) : undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserBySessionId(sessionId: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ sessionId });
      return user ? this.mongoUserToUser(user) : undefined;
    } catch (error) {
      console.error('Error getting user by session ID:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Try to find existing user by sessionId first
    const existingUser = await UserModel.findOne({ sessionId: insertUser.sessionId });
    if (existingUser) {
      // Update existing user
      existingUser.username = insertUser.username;
      existingUser.color = insertUser.color;
      existingUser.currentDocument = insertUser.currentDocument || null;
      existingUser.lastSeen = new Date();
      const savedUser = await existingUser.save();
      return this.mongoUserToUser(savedUser);
    }

    // Create new user
    const user = new UserModel({
      sessionId: insertUser.sessionId,
      username: insertUser.username,
      color: insertUser.color,
      currentDocument: insertUser.currentDocument || null
    });

    const savedUser = await user.save();
    return this.mongoUserToUser(savedUser);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      const updatedUser = await UserModel.findByIdAndUpdate(
        id,
        { ...updates, lastSeen: new Date() },
        { new: true }
      );
      return updatedUser ? this.mongoUserToUser(updatedUser) : undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async getUsersByDocument(documentId: string): Promise<User[]> {
    try {
      const users = await UserModel.find({ currentDocument: documentId });
      return users.map(user => this.mongoUserToUser(user));
    } catch (error) {
      console.error('Error getting users by document:', error);
      return [];
    }
  }

  async cleanupInactiveUsers(beforeTime: Date): Promise<void> {
    try {
      await UserModel.deleteMany({ lastSeen: { $lt: beforeTime } });
    } catch (error) {
      console.error('Error cleaning up inactive users:', error);
    }
  }
}