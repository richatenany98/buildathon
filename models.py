from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

class JobStatus(Enum):
    QUEUED = "queued"
    PROCESSING = "processing"  
    COMPLETED = "completed"
    FAILED = "failed"

class SyncStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class Document:
    """Document model for MongoDB storage"""
    source_type: str  # "txt" or "url"
    source_uri: Optional[str]  # file name or URL
    content_hash: str
    content_text: str
    byte_size: int
    ingest_job_id: str
    created_at: datetime
    updated_at: datetime
    _id: Optional[str] = None

@dataclass  
class IngestJob:
    """Ingestion job model for MongoDB storage"""
    status: JobStatus
    inputs: List[Dict[str, Any]]
    total_bytes: int
    error: Optional[str] = None
    created_at: datetime = None
    updated_at: datetime = None
    _id: Optional[str] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()

@dataclass
class GraphSync:
    """Graph synchronization model for MongoDB storage"""
    ingest_job_id: str
    neo4j_tx_id: Optional[str]
    status: SyncStatus
    stats: Dict[str, int]
    error: Optional[str] = None
    created_at: datetime = None
    updated_at: datetime = None
    _id: Optional[str] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()

@dataclass
class QALog:
    """Q&A log model for MongoDB storage"""
    question: str
    params: Dict[str, Any]
    answer_text: Optional[str]
    evidence: Dict[str, List[str]]
    status: str  # "ok" or "error"
    error: Optional[str] = None
    duration_ms: int = 0
    created_at: datetime = None
    _id: Optional[str] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()

@dataclass
class ConceptNode:
    """Concept node model for Neo4j"""
    id: str
    label: str
    canonical_key: str
    created_at: datetime
    
@dataclass
class DocumentNode:
    """Document node model for Neo4j"""  
    id: str
    source_uri: str
    content_hash: str

@dataclass
class GraphEdge:
    """Graph edge model"""
    source_id: str
    target_id: str
    relationship_type: str
    properties: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.properties is None:
            self.properties = {}
