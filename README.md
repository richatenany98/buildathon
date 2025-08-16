# Codebase Time Machine

An AI-powered codebase analysis platform that provides semantic understanding of repository evolution, featuring intelligent repository processing and deep code change insights.

## Features

- **Smart Repository Analysis**: Clone and analyze any GitHub repository
- **AI-Powered Insights**: Uses Claude Sonnet 4 to understand the "why" behind code changes
- **Timeline Visualization**: Interactive timeline showing major changes and evolution
- **Natural Language Queries**: Ask questions about your codebase in plain English
- **Change Categorization**: Automatically categorizes changes (features, bug fixes, refactoring, etc.)
- **Export Reports**: Generate comprehensive analysis reports

## Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- Anthropic API key for AI analysis

### Local Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd codebase-time-machine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Required for AI analysis
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   
   # Optional: MongoDB connection (if not provided, uses in-memory storage)
   MONGODB_URL=mongodb://localhost:27017/codebase-analysis
   # or for MongoDB Atlas:
   # MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/codebase-analysis
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5000` to access the application.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key for AI analysis |
| `MONGODB_URL` | No | MongoDB connection string (uses in-memory storage if not provided) |

## Getting API Keys

### Anthropic API Key
1. Sign up at [Anthropic Console](https://console.anthropic.com/)
2. Create a new API key
3. Add it to your `.env` file as `ANTHROPIC_API_KEY`

### MongoDB Setup (Optional)
- **Local MongoDB**: Install MongoDB locally and use `mongodb://localhost:27017/codebase-analysis`
- **MongoDB Atlas**: Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas) and use the connection string

## Usage

1. **Add a Repository**: Enter any public GitHub repository URL
2. **Wait for Analysis**: The system will clone and analyze the repository (can take a few minutes for large repos)
3. **Explore Results**: View the timeline, statistics, and ask questions about the codebase
4. **Export Reports**: Generate comprehensive analysis reports

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB with Mongoose (with in-memory fallback)
- **AI**: Anthropic Claude Sonnet 4
- **Git Analysis**: simple-git for repository processing

## Project Structure

```
├── client/src/          # React frontend
│   ├── components/      # UI components
│   ├── pages/          # Page components
│   └── lib/            # Utilities and types
├── server/             # Express backend
│   ├── services/       # Business logic (Git & AI analysis)
│   ├── storage*.ts     # Database layer
│   └── routes.ts       # API endpoints
├── shared/             # Shared types and schemas
└── package.json        # Dependencies and scripts
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type checking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details