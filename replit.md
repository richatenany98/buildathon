# Universal Knowledge Graph Builder

## Overview

The Universal Knowledge Graph Builder is a Flask-based web application that converts document archives (TXT files and URLs) into interactive knowledge graphs. The system ingests documents, extracts concepts and relationships using NLP, stores them in a Neo4j graph database, and provides a natural language Q&A interface for querying the knowledge graph. The application features a modern web interface with D3.js-powered graph visualization and supports document ingestion up to 100MB total size.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Flask web application with Blueprint-based API organization
- **API Design**: RESTful APIs organized into three main modules:
  - Ingestion API (`/api/ingest/*`) - handles document upload and processing
  - Graph API (`/api/graph/*`) - manages knowledge graph construction and retrieval
  - Q&A API (`/api/qa/*`) - provides natural language question answering
- **Authentication**: Bearer token-based authentication using environment-configured tokens
- **Error Handling**: Comprehensive logging and structured error responses

### Data Storage Architecture
- **Primary Graph Store**: Neo4j database for storing concept nodes, document nodes, and relationships
  - Concept nodes with canonical keys for deduplication
  - Document nodes for provenance tracking
  - Typed relationships (MENTIONS, RELATED_TO, etc.)
- **Document Store**: MongoDB for raw document storage, job tracking, and metadata
  - Documents collection with content hashing for deduplication
  - Ingest jobs collection for async processing status
  - Graph sync collection for build job tracking
  - Q&A logs collection for interaction history

### NLP Processing Pipeline
- **Engine**: spaCy with configurable language models (default: en_core_web_sm)
- **Concept Extraction**: Multi-stage pipeline extracting entities, keywords, and noun phrases
- **Relationship Detection**: Co-occurrence and dependency parsing-based relationship extraction
- **Canonicalization**: Automatic concept deduplication and normalization across documents

### Frontend Architecture
- **UI Framework**: Bootstrap with dark theme for responsive design
- **Graph Visualization**: D3.js force-directed graph with interactive features:
  - Drag and drop node positioning
  - Zoom and pan controls
  - Real-time physics simulation
  - Node filtering and search capabilities
- **Component Architecture**: Modular JavaScript classes for app logic, graph visualization, and Q&A interface

### Processing Architecture
- **Async Job System**: MongoDB-based job queue for document processing and graph building
- **Status Tracking**: Real-time job status updates (queued → processing → completed/failed)
- **Idempotent Operations**: Content-based deduplication prevents duplicate processing
- **Batch Processing**: Efficient bulk operations for large document sets

## External Dependencies

### Core Infrastructure
- **Neo4j**: Graph database for storing knowledge graph structure and relationships
- **MongoDB**: Document database for raw content, job tracking, and application metadata
- **Redis** (optional): Can be integrated for enhanced caching and job queuing

### NLP and Processing Libraries
- **spaCy**: Primary NLP library for text processing and concept extraction
- **trafilatura**: Web content extraction and text cleaning for URL ingestion
- **requests**: HTTP client for web scraping with retry logic and proper headers

### Frontend Libraries
- **D3.js v7**: Interactive graph visualization and data manipulation
- **Bootstrap 5**: UI framework with dark theme support
- **Font Awesome**: Icon library for enhanced user interface

### Python Dependencies
- **Flask**: Web framework with Werkzeug middleware for proxy handling
- **PyMongo**: MongoDB driver for Python
- **neo4j-driver**: Official Neo4j Python driver
- **werkzeug**: WSGI utilities and security helpers

### Development and Deployment
- **Environment Configuration**: Environment variable-based configuration management
- **Logging**: Python logging with configurable levels for debugging and monitoring
- **CORS and Security**: Proxy-aware middleware and secure session management