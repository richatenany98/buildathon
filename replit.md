# Overview

The Codebase Time Machine is an AI-powered system that analyzes the complete Git history of repositories to provide semantic understanding of code evolution. It clones repositories, processes commit history, and uses artificial intelligence to answer "why" questions about architectural decisions, feature development, and code changes over time. The application provides both a web interface for querying and visualizing repository evolution and REST APIs for programmatic access.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built using React with TypeScript, utilizing modern development practices:

- **Framework**: React 18 with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management with caching
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Build Tool**: Vite for fast development and optimized production builds

The component architecture follows a modular approach with reusable UI components, page-level components, and specialized analysis visualizations. The application uses a GitHub-inspired design system with consistent color schemes and typography.

## Backend Architecture  
The server is built on Node.js with Express, designed for scalability and real-time analysis:

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js for REST API endpoints
- **Language**: TypeScript for type safety across the full stack
- **Architecture Pattern**: Service-oriented with separate concerns for Git analysis and AI processing

### Core Services
- **GitAnalyzer**: Handles repository cloning, commit extraction, and Git history processing using simple-git
- **AIAnalyzer**: Processes commits through OpenAI's GPT models to extract semantic meaning and categorize changes
- **Storage Service**: Provides abstraction layer for data persistence with in-memory implementation

## Data Storage Solutions
The application uses a flexible storage architecture:

- **Primary Database**: MongoDB with Mongoose ODM for type-safe database operations
- **Database Provider**: MongoDB Atlas for cloud deployments or local MongoDB for development
- **Schema Management**: Mongoose schemas with automatic collection creation
- **Fallback Storage**: In-memory storage implementation for development and testing

### Data Models
- **Repositories**: MongoDB documents storing repository metadata, analysis status, and statistical summaries with ObjectId identifiers
- **Commits**: Individual commit documents with metadata, author information, change metrics, embedded file paths, file types, and semantic change categorization arrays
- **Change Events**: AI-analyzed groups of related commits representing semantic changes with business rationale and impact analysis
- **Queries**: User questions and AI-generated responses with related context and confidence scores

## Authentication and Authorization
Currently implements a simplified security model focused on development:
- No user authentication system implemented
- API endpoints are publicly accessible
- Session management placeholder using connect-pg-simple for future implementation

## External Service Integrations

### AI Processing
- **Anthropic API**: Claude Sonnet 4 model for deep semantic analysis of code changes with enhanced business context understanding
- **Analysis Pipeline**: Batch processing of commits with retry logic and error handling
- **Enhanced Content Processing**: 
  - Commit message analysis with business intent extraction
  - File path pattern recognition for semantic categorization
  - Change type classification (new_page, new_component, api_change, authentication, etc.)
  - Business impact analysis connecting code changes to user value
  - Purpose-driven explanations focusing on "why" rather than just "what"

### Git Integration
- **Repository Cloning**: Supports HTTPS and SSH protocols for repository access
- **History Processing**: Complete commit history analysis with rename/move detection
- **Metadata Extraction**: Author information, timestamps, file changes, and line-level statistics

### Development Tools
- **Replit Integration**: Custom Vite plugins for Replit environment compatibility
- **Error Overlay**: Runtime error modal for development debugging
- **Hot Module Replacement**: Fast refresh during development with Vite HMR

The system is designed to handle large repositories efficiently through batch processing, streaming analysis, and incremental updates while providing real-time progress feedback to users.