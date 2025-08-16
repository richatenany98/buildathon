import os

class Config:
    """Application configuration"""
    
    # Neo4j Configuration
    NEO4J_URI = os.environ.get('NEO4J_URI', 'neo4j://localhost:7687')
    NEO4J_USERNAME = os.environ.get('NEO4J_USERNAME', 'neo4j')
    NEO4J_PASSWORD = os.environ.get('NEO4J_PASSWORD', 'password')
    
    # MongoDB Configuration
    MONGODB_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/knowledge_graph')
    
    # Authentication
    MONGODB_AUTH_TOKEN = os.environ.get('MONGODB_AUTH_TOKEN', 'secure_token_here')
    
    # File upload limits
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB
    
    # NLP Configuration
    SPACY_MODEL = os.environ.get('SPACY_MODEL', 'en_core_web_sm')
    
    # Application settings
    SECRET_KEY = os.environ.get('SESSION_SECRET', 'dev-secret-key-change-in-production')
