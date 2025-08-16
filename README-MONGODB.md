# Running Codebase Time Machine Locally with MongoDB

This guide explains how to run the Codebase Time Machine project locally using MongoDB instead of PostgreSQL.

## Prerequisites

- **Node.js** (version 18 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or cloud service)
- **Git** (system git binary)

## Setup Instructions

### 1. Clone/Download the Project
```bash
# If you have git access to this project
git clone <your-repo-url>
cd <project-name>

# Or download the files manually from Replit
```

### 2. Install Dependencies
```bash
npm install
```

### 3. MongoDB Setup

You have several options for MongoDB:

#### Option A: Local MongoDB Installation
1. Install MongoDB locally following the [official guide](https://docs.mongodb.com/manual/installation/)
2. Start MongoDB service:
   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Ubuntu/Debian
   sudo systemctl start mongod
   
   # On Windows
   net start MongoDB
   ```

#### Option B: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string from the "Connect" button
4. Whitelist your IP address

#### Option C: Docker
```bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Environment Variables

Create a `.env` file in the root directory:

```bash
# MongoDB Connection
MONGODB_URL=mongodb://localhost:27017/codebase-analysis
# Or for MongoDB Atlas:
# MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/codebase-analysis

# Alternative (for compatibility)
DATABASE_URL=mongodb://localhost:27017/codebase-analysis

# API Keys for AI Analysis
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: OpenAI if you prefer that instead
# OPENAI_API_KEY=your_openai_api_key_here
```

### 5. Start the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Key Changes from PostgreSQL Version

### Database Layer
- **Storage**: Uses MongoDB with Mongoose ODM instead of PostgreSQL with Drizzle ORM
- **Schema**: Defined using Mongoose schemas with TypeScript interfaces
- **IDs**: Uses MongoDB ObjectIds instead of UUIDs
- **Queries**: Native MongoDB queries instead of SQL

### Fallback Behavior
The application automatically detects the database type:
- If `MONGODB_URL` or `DATABASE_URL` contains "mongodb", it uses MongoDB
- Otherwise, it falls back to in-memory storage for development

### Data Models
All models now use MongoDB conventions:
- `_id` instead of `id` for primary keys
- Embedded arrays for file paths, change types, etc.
- Date objects instead of timestamp strings

## Development Features

### Automatic Storage Selection
The app automatically chooses the right storage:
```typescript
const storage = mongoUrl && mongoUrl.includes('mongodb') 
  ? new MongoStorage(mongoUrl) 
  : new MemStorage();
```

### No Migration Required
Unlike SQL databases, MongoDB doesn't require schema migrations. The app creates collections automatically when data is first inserted.

### Git Binary Path
Updated to use system git instead of Replit-specific paths:
```typescript
// Uses system git binary
binary: 'git'
```

## Troubleshooting

### MongoDB Connection Issues
1. **Connection refused**: Make sure MongoDB is running
2. **Authentication failed**: Check your username/password in the connection string
3. **Database not found**: MongoDB creates databases automatically when first accessed

### Environment Variables
- Variables must be prefixed with `VITE_` to be available in the frontend
- Use `import.meta.env.VITE_VARIABLE` in frontend code
- Backend uses standard `process.env.VARIABLE`

### Git Issues
- Make sure `git` is installed and available in your system PATH
- The app now uses system git instead of Replit-specific paths

## MongoDB vs In-Memory Storage

### Development
- **In-Memory**: Data lost on restart, instant startup
- **MongoDB**: Persistent data, requires database setup

### Production
- **MongoDB**: Required for production deployments
- **Scaling**: MongoDB handles concurrent users and large datasets

## API Structure

All APIs remain the same, but data structure uses MongoDB conventions:

```json
// Repository document
{
  "_id": "507f1f77bcf86cd799439011",
  "url": "https://github.com/user/repo.git",
  "name": "repo-name",
  "analysisStatus": "completed",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "commitCount": 150,
  "changeEventCount": 25
}
```

The frontend automatically handles the MongoDB `_id` field and treats it as the standard identifier.