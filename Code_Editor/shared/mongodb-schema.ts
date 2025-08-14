import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

// Auth User Schema (for registered users)
interface IAuthUser extends MongoDocument {
  email: string;
  username: string;
  password: string;
  avatar?: string;
  createdAt: Date;
  lastLogin: Date;
}

const AuthUserSchema = new Schema<IAuthUser>({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

// Document Schema
interface IDocument extends MongoDocument {
  title: string;
  content: string;
  language: string;
  activeUsers: string[];
  ownerId: string; // Reference to AuthUser
  ownerUsername: string;
  isPublic: boolean;
  collaborators: string[]; // Array of user IDs who can edit
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  activeUsers: [{ type: String }],
  ownerId: { type: String, required: true, ref: 'AuthUser' },
  ownerUsername: { type: String, required: true },
  isPublic: { type: Boolean, default: false },
  collaborators: [{ type: String, ref: 'AuthUser' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Document Version Schema
interface IDocumentVersion extends MongoDocument {
  documentId: string;
  content: string;
  version: number;
  operations: any[];
  authorId: string;
  authorName: string;
  timestamp: Date;
}

const DocumentVersionSchema = new Schema<IDocumentVersion>({
  documentId: { type: String, required: true, ref: 'Document' },
  content: { type: String, required: true },
  version: { type: Number, required: true },
  operations: [{ type: Schema.Types.Mixed }],
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// User Schema
interface IUser extends MongoDocument {
  sessionId: string;
  username: string;
  color: string;
  currentDocument: string | null;
  lastSeen: Date;
}

const UserSchema = new Schema<IUser>({
  sessionId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  color: { type: String, required: true },
  currentDocument: { type: String, ref: 'Document', default: null },
  lastSeen: { type: Date, default: Date.now }
});

// Models
export const AuthUserModel = mongoose.model<IAuthUser>('AuthUser', AuthUserSchema);
export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
export const DocumentVersionModel = mongoose.model<IDocumentVersion>('DocumentVersion', DocumentVersionSchema);
export const UserModel = mongoose.model<IUser>('User', UserSchema);

// Types for compatibility
export type AuthUser = {
  id: string;
  email: string;
  username: string;
  password: string;
  avatar?: string;
  createdAt: Date;
  lastLogin: Date;
};

export type Document = {
  id: string;
  title: string;
  content: string;
  language: string;
  activeUsers: string[];
  ownerId: string;
  ownerUsername: string;
  isPublic: boolean;
  collaborators: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentVersion = {
  id: string;
  documentId: string;
  content: string;
  version: number;
  operations: any[];
  authorId: string;
  authorName: string;
  timestamp: Date;
};

export type User = {
  id: string;
  sessionId: string;
  username: string;
  color: string;
  currentDocument: string | null;
  lastSeen: Date;
};

export type InsertAuthUser = {
  email: string;
  username: string;
  password: string;
  avatar?: string;
};

export type InsertDocument = {
  title: string;
  content?: string;
  language?: string;
  ownerId: string;
  ownerUsername: string;
  isPublic?: boolean;
  collaborators?: string[];
};

export type InsertDocumentVersion = {
  documentId: string;
  content: string;
  version: number;
  operations?: any[];
  authorId: string;
  authorName: string;
};

export type InsertUser = {
  sessionId: string;
  username: string;
  color: string;
  currentDocument?: string | null;
};