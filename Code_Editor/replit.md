# Real-Time Collaborative Code Editor

## Overview

This is a full-stack real-time collaborative code editor application built with React, Express, and Socket.io. The application enables multiple users to simultaneously edit code documents with real-time synchronization, cursor tracking, and collaborative features. It features a modern Monaco Editor integration with VSCode-like syntax highlighting and editing capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom VSCode-inspired theme variables
- **Code Editor**: Monaco Editor integration for professional code editing experience
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: Socket.io client for WebSocket connections

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Real-time Engine**: Socket.io server for WebSocket-based collaboration
- **API Design**: RESTful endpoints for document CRUD operations
- **Storage Layer**: In-memory storage with interface for future database integration
- **Session Management**: Socket-based user session tracking with automatic cleanup

### Data Storage Solutions
- **Database ORM**: Drizzle ORM configured for PostgreSQL with Neon Database
- **Schema Design**: 
  - Documents table for storing code files with metadata
  - Document versions table for change history tracking
  - Users table for session and collaboration management
- **Migrations**: Drizzle Kit for database schema management
- **Current Implementation**: In-memory storage with database-ready interface

### Real-time Collaboration Features
- **Operational Transform**: Custom implementation for conflict-free collaborative editing
- **User Presence**: Real-time cursor positions and text selections tracking
- **Document Synchronization**: Automatic content sync with version control
- **Connection Management**: Robust reconnection handling and state recovery

### Authentication and Authorization
- **Session-based**: Simple session ID generation for user identification
- **No Authentication**: Open collaboration model without user registration
- **User Identity**: Random username generation with color assignment

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: Neon Database PostgreSQL driver
- **drizzle-orm**: TypeScript ORM for database operations
- **socket.io**: Real-time bidirectional event-based communication
- **monaco-editor**: VSCode's editor as a web component

### UI and Styling
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe component variant management
- **lucide-react**: Modern icon library

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production

### State Management
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers

### Utilities
- **date-fns**: Date manipulation library
- **clsx**: Conditional className utility
- **nanoid**: URL-safe unique ID generator